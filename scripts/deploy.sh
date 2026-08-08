#!/usr/bin/env bash
#
# Levantry production deployment.
# Canonical deployment documentation: docs/DEPLOYMENT.md
# Git push does NOT deploy production.
#
# Build locally, ship dist/ to Levantry's own directory on the shared VM over
# SSH, swap it in atomically, then prove that levantry.app is serving the
# bundle this run just produced. Nothing here touches, reads, or depends on
# any other application hosted on the same machine.
#
#   ./scripts/deploy.sh              test, build, upload, verify
#   ./scripts/deploy.sh --dry-run    everything local; nothing is sent
#   ./scripts/deploy.sh --with-push  push origin/main first, then deploy
#   ./scripts/deploy.sh --rollback   repoint production at the previous release
#
set -euo pipefail

# MSYS/Git Bash rewrites arguments that look like absolute paths into Windows
# paths, which would corrupt every remote path handed to ssh. Turn that off.
export MSYS2_ARG_CONV_EXCL='*'
export MSYS_NO_PATHCONV=1

EXPECTED_REMOTE="https://github.com/Mali-P/Levant-Lab.git"
EXPECTED_BRANCH="main"
EXPECTED_PACKAGE="levantry"
PROD_URL="https://levantry.app/"
WWW_URL="https://www.levantry.app/"

# How many past releases stay on the VM for rollback. Older ones are pruned so
# obsolete hashed assets cannot accumulate indefinitely.
KEEP_RELEASES="${KEEP_RELEASES:-5}"

# The live site is served straight off disk, so verification only has to
# survive CDN-less HTTP caching -- seconds, not minutes.
VERIFY_TIMEOUT_SECONDS="${VERIFY_TIMEOUT_SECONDS:-60}"
VERIFY_INTERVAL_SECONDS=5

DRY_RUN=0
WITH_PUSH=0
ROLLBACK=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=1 ;;
    --with-push) WITH_PUSH=1 ;;
    --rollback)  ROLLBACK=1 ;;
    *) printf 'unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

die() { printf '\n  REFUSING TO DEPLOY\n  %s\n\n' "$1" >&2; exit 1; }
fail() { printf '\n  DEPLOYMENT FAILED\n  %s\n\n' "$1" >&2; exit 1; }
step() { printf '\n  -> %s\n' "$1"; }

cd "$(dirname "$0")/.."
ROOT="$(pwd -W 2>/dev/null || pwd)"

# Machine-specific values live outside git. See docs/DEPLOYMENT.md.
if [ -f .env.deploy ]; then
  # shellcheck disable=SC1091
  . ./.env.deploy
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/levantry}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/oracle_cl_master}"

# ---------------------------------------------------------------------------
printf '\n  Levantry production deploy\n'
printf '  Mechanism:      local build -> SSH -> %s\n' "$DEPLOY_PATH"
printf '  Documentation:  docs/DEPLOYMENT.md\n'
printf '  Target:         %s\n' "$PROD_URL"
printf '  Note:           a git push does NOT deploy production\n'

# ---------------------------------------------------------------------------
# Guard rail: this deploy may only ever touch Levantry. Anything that even
# smells of the sibling projects in C:\Projects aborts the run outright.
# ---------------------------------------------------------------------------
FORBIDDEN='p''esto'

step "Checking the target"

if printf '%s' "$ROOT" | grep -qi "$FORBIDDEN"; then
  die "run from a forbidden path: $ROOT"
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  die "$ROOT is not a git repository"
fi

if git remote -v | grep -qi "$FORBIDDEN"; then
  die "a forbidden remote is configured on this repo:
$(git remote -v)"
fi

REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo '')"
if [ "$REMOTE_URL" != "$EXPECTED_REMOTE" ]; then
  die "origin is '$REMOTE_URL'
  expected '$EXPECTED_REMOTE'"
fi

PACKAGE_NAME="$(node -p "require('./package.json').name" 2>/dev/null || echo '')"
if [ "$PACKAGE_NAME" != "$EXPECTED_PACKAGE" ]; then
  die "package.json says '$PACKAGE_NAME', expected '$EXPECTED_PACKAGE' --
  this is not the Levantry checkout"
fi

# The deploy target is the one value that can destroy a neighbour's site if it
# is wrong, so it is checked here and again on the VM before anything is
# written or removed. Only Levantry's own directory is ever an acceptable
# answer -- never /var/www, never a parent of it, never someone else's tree.
case "$DEPLOY_PATH" in
  /var/www/levantry|/var/www/levantry-*) ;;
  *) die "DEPLOY_PATH is '$DEPLOY_PATH'.
  Only Levantry's own directory may be deployed to, e.g. /var/www/levantry.
  A broader path could destroy another application on this shared VM." ;;
esac
if printf '%s' "$DEPLOY_PATH" | grep -qi -e "$FORBIDDEN" -e '\.\.'; then
  die "DEPLOY_PATH is not a plain Levantry path: $DEPLOY_PATH"
fi

if [ -z "$DEPLOY_HOST" ]; then
  die "DEPLOY_HOST is not set.
  Copy .env.deploy.example to .env.deploy and fill it in, or export
  DEPLOY_HOST / DEPLOY_USER / DEPLOY_PATH. See docs/DEPLOYMENT.md."
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "$EXPECTED_BRANCH" ]; then
  die "on branch '$BRANCH'. Only '$EXPECTED_BRANCH' is deployed.
  Merge into $EXPECTED_BRANCH first."
fi

if [ -n "$(git status --porcelain)" ]; then
  die "the working tree is dirty. Commit or stash first:
$(git status --short)"
fi

printf '    repo    %s\n    branch  %s\n    commit  %s\n' \
  "$REMOTE_URL" "$BRANCH" "$(git log -1 --format='%h %s')"
printf '    server  %s@%s:%s\n' "$DEPLOY_USER" "$DEPLOY_HOST" "$DEPLOY_PATH"

# ---------------------------------------------------------------------------
SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -p "$DEPLOY_PORT")
[ -f "$DEPLOY_KEY" ] && SSH_OPTS+=(-i "$DEPLOY_KEY")

# Every remote command re-proves the target path before it does anything, so a
# mistyped DEPLOY_PATH cannot reach a neighbouring application even if the
# local guard above were somehow bypassed.
remote() {
  ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
    "set -eu; P='$DEPLOY_PATH'
     case \"\$P\" in
       /var/www/levantry|/var/www/levantry-*) ;;
       *) echo 'remote refused: unsafe deploy path' >&2; exit 1 ;;
     esac
     $1"
}

# ---------------------------------------------------------------------------
if [ "$ROLLBACK" = "1" ]; then
  step "Rolling back to the previous release"
  remote '
    cd "$P/releases"
    CURRENT="$(basename "$(readlink -f "$P/current")")"
    PREVIOUS="$(ls -1 | sort -r | grep -v -x -F "$CURRENT" | head -1)"
    [ -n "$PREVIOUS" ] || { echo "no previous release to roll back to" >&2; exit 1; }
    ln -sfn "$P/releases/$PREVIOUS" "$P/.current.new"
    mv -Tf "$P/.current.new" "$P/current"
    echo "    rolled back: $CURRENT -> $PREVIOUS"
  '
  printf '\n    Confirm with: curl -s %s | grep -o "assets/index-[^\"]*\\.js"\n\n' "$PROD_URL"
  exit 0
fi

# ---------------------------------------------------------------------------
step "Running the tests"
npm test

step "Typechecking"
npm run typecheck

step "Building"
npm run build

[ -f dist/index.html ] || fail "the build produced no dist/index.html"

# ---------------------------------------------------------------------------
# Vite fingerprints each bundle by content, so the asset names in the dist/ we
# just built are exactly what production must end up serving. That is the only
# claim that proves a deploy landed; an exit code from a transfer is not.
# ---------------------------------------------------------------------------
js_pattern='assets/index-[A-Za-z0-9_-]\+\.js'
css_pattern='assets/index-[A-Za-z0-9_-]\+\.css'

EXPECTED_JS="$(grep -o "$js_pattern" dist/index.html | head -1 || true)"
EXPECTED_CSS="$(grep -o "$css_pattern" dist/index.html | head -1 || true)"
[ -n "$EXPECTED_JS" ] || fail "could not find a hashed JS bundle in dist/index.html"

live_js() {
  curl -fsS --max-time 15 -H 'Cache-Control: no-cache' "$PROD_URL" 2>/dev/null \
    | grep -o "$js_pattern" | head -1 || true
}
ASSET_BEFORE="$(live_js)"

printf '    built     %s\n' "$EXPECTED_JS"
printf '    live now  %s\n' "${ASSET_BEFORE:-<unreachable>}"

if [ "$DRY_RUN" = "1" ]; then
  printf '\n    --dry-run: stopping before upload. Nothing was sent.\n\n'
  exit 0
fi

# ---------------------------------------------------------------------------
if [ "$WITH_PUSH" = "1" ]; then
  step "Pushing to origin/$EXPECTED_BRANCH (source control only -- not a deploy)"
  git push origin "$EXPECTED_BRANCH"
fi

# ---------------------------------------------------------------------------
step "Uploading the build"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE="$DEPLOY_PATH/releases/$STAMP"

remote "mkdir -p \"\$P/releases/$STAMP\""

# rsync --delete is preferred where it exists. It is not shipped with Git Bash
# on Windows, so the fallback streams a tar into a brand-new release directory
# instead: a fresh directory per release gives the same guarantee --delete
# does, since nothing stale can survive into it, and old releases are pruned
# below. Either way the write is confined to $RELEASE.
if command -v rsync >/dev/null 2>&1; then
  printf '    transport rsync --delete\n'
  rsync -az --delete --chmod=D755,F644 \
    -e "ssh ${SSH_OPTS[*]}" \
    dist/ "$DEPLOY_USER@$DEPLOY_HOST:$RELEASE/"
else
  printf '    transport tar over ssh (rsync unavailable locally)\n'
  tar -C dist -czf - . \
    | remote "tar -C \"\$P/releases/$STAMP\" -xzf - && chmod -R u=rwX,go=rX \"\$P/releases/$STAMP\""
fi

REMOTE_JS="$(remote "grep -o '$js_pattern' \"\$P/releases/$STAMP/index.html\" | head -1" || true)"
if [ "$REMOTE_JS" != "$EXPECTED_JS" ]; then
  fail "the uploaded index.html references '$REMOTE_JS', expected '$EXPECTED_JS'.
  The transfer did not land intact. Production was NOT switched over."
fi
printf '    uploaded  %s\n' "$RELEASE"

# ---------------------------------------------------------------------------
step "Switching production over"

# ln + mv -T is a single atomic rename, so no request is ever served out of a
# half-written directory.
remote "
  ln -sfn \"\$P/releases/$STAMP\" \"\$P/.current.new\"
  mv -Tf \"\$P/.current.new\" \"\$P/current\"
  echo \"    current -> \$(readlink -f \"\$P/current\")\"
"

step "Pruning old releases (keeping $KEEP_RELEASES)"
remote "
  cd \"\$P/releases\"
  KEEP='$KEEP_RELEASES'
  CURRENT=\"\$(basename \"\$(readlink -f \"\$P/current\")\")\"
  # Deletion is scoped to this directory and never removes the live release.
  ls -1 | sort -r | grep -v -x -F \"\$CURRENT\" | tail -n +\$KEEP | while read -r old; do
    case \"\$old\" in
      ''|*/*|.|..) continue ;;
    esac
    rm -rf -- \"\$P/releases/\$old\"
    echo \"    pruned \$old\"
  done
  true
"

# ---------------------------------------------------------------------------
step "Verifying production"

printf '    expecting  %s\n' "$EXPECTED_JS"

DEADLINE=$(( $(date +%s) + VERIFY_TIMEOUT_SECONDS ))
CURRENT=""
while :; do
  CURRENT="$(live_js)"
  [ "$CURRENT" = "$EXPECTED_JS" ] && break
  [ "$(date +%s)" -ge "$DEADLINE" ] && break
  printf '    ... live is %s, retrying in %ss\n' "${CURRENT:-<unreachable>}" "$VERIFY_INTERVAL_SECONDS"
  sleep "$VERIFY_INTERVAL_SECONDS"
done

printf '    live now   %s\n' "${CURRENT:-<unreachable>}"

if [ "$CURRENT" != "$EXPECTED_JS" ]; then
  printf '\n  ============================================\n'
  printf '   NOT VERIFIED - production is serving a different bundle\n'
  printf '  ============================================\n'
  printf '    expecting  %s\n    live now   %s\n\n' "$EXPECTED_JS" "${CURRENT:-<unreachable>}"
  printf '    The files were uploaded and the symlink was swapped, so the most\n'
  printf '    likely causes are an nginx root that does not point at\n'
  printf '    %s/current, or a cached index.html.\n' "$DEPLOY_PATH"
  printf '    Roll back with: ./scripts/deploy.sh --rollback\n\n'
  exit 1
fi

# The apex serving the right bundle is the deploy; these two confirm the rest
# of the public contract still holds.
WWW_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$WWW_URL" 2>/dev/null || echo '000')"
WWW_TARGET="$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 15 "$WWW_URL" 2>/dev/null || echo '')"
CSS_OK="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 15 "${PROD_URL}${EXPECTED_CSS}" 2>/dev/null || echo '000')"

printf '\n  ============================================\n'
printf '   Production deployment verified\n'
printf '  ============================================\n'
printf '    commit     %s\n' "$(git log -1 --format='%h %s')"
printf '    release    %s\n' "$RELEASE"
printf '    js         %s\n' "$EXPECTED_JS"
printf '    css        %s (http %s)\n' "$EXPECTED_CSS" "$CSS_OK"
printf '    www        http %s -> %s\n' "$WWW_STATUS" "${WWW_TARGET:-<none>}"
printf '\n    levantry.app is serving the bundle built from this commit.\n\n'
