#!/usr/bin/env bash
#
# Deploy Levantry to levantry.app.
#
# levantry.app is served by a host wired to the GitHub repo, so a push to
# main IS the deploy: the host builds from source on every push. This script
# does the checking that a bare `git push` does not, and refuses to run at all
# if anything about the target looks wrong.
#
#   ./scripts/deploy.sh                 build, test, push, verify
#   ./scripts/deploy.sh --dry-run       everything except the push
#   ./scripts/deploy.sh --skip-verify   push, but do not wait for the rebuild
#   ./scripts/deploy.sh --strict-verify treat an unverified deploy as a failure
#
set -euo pipefail

EXPECTED_REMOTE="https://github.com/Mali-P/Levant-Lab.git"
EXPECTED_BRANCH="main"
EXPECTED_PACKAGE="levantry"
PROD_URL="https://levantry.app/"

# The host rebuilds asynchronously, so verification polls rather than assumes.
VERIFY_TIMEOUT_SECONDS=180
VERIFY_INTERVAL_SECONDS=10

DRY_RUN=0
SKIP_VERIFY=0
STRICT_VERIFY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)       DRY_RUN=1 ;;
    --skip-verify)   SKIP_VERIFY=1 ;;
    --strict-verify) STRICT_VERIFY=1 ;;
    *) printf 'unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

die() { printf '\n  REFUSING TO DEPLOY\n  %s\n\n' "$1" >&2; exit 1; }
step() { printf '\n  -> %s\n' "$1"; }

cd "$(dirname "$0")/.."
ROOT="$(pwd -W 2>/dev/null || pwd)"

# ---------------------------------------------------------------------------
# Guard rail: this deploy may only ever reach Levant-Lab. Anything that even
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

# ---------------------------------------------------------------------------
# The host runs `npm run build` itself, and a failing build there is a failed
# deploy on the live site. Catch it here instead.
# ---------------------------------------------------------------------------
step "Running the tests"
npm test

step "Building (the same command the host runs)"
npm run build

# ---------------------------------------------------------------------------
step "Shipping"

AHEAD="$(git rev-list --count "origin/$EXPECTED_BRANCH..HEAD" 2>/dev/null || echo '?')"
if [ "$AHEAD" = "0" ]; then
  printf '    Nothing to push -- origin/%s already has this commit.\n\n' "$EXPECTED_BRANCH"
  exit 0
fi
printf '    %s commit(s) to push:\n' "$AHEAD"
git --no-pager log --oneline "origin/$EXPECTED_BRANCH..HEAD" | sed 's/^/      /'

if [ "$DRY_RUN" = "1" ]; then
  printf '\n    --dry-run: stopping before the push. Nothing was sent.\n\n'
  exit 0
fi

# ---------------------------------------------------------------------------
# Two separate claims, never conflated: the push landed in git, and the live
# site is actually serving it. `git push` returning 0 only ever proves the
# first. Vite fingerprints the bundle by content, so the asset name in the
# dist/ we just built is a prediction of what the host will serve once its
# rebuild finishes -- package-lock.json is committed, so the host resolves the
# same dependency tree and arrives at the same hash.
# ---------------------------------------------------------------------------
asset_pattern='assets/index-[A-Za-z0-9_-]\+\.js'

live_asset() {
  curl -fsS --max-time 15 -H 'Cache-Control: no-cache' "$PROD_URL" 2>/dev/null \
    | grep -o "$asset_pattern" | head -1 || true
}

EXPECTED_ASSET="$(grep -o "$asset_pattern" dist/index.html 2>/dev/null | head -1 || true)"
ASSET_BEFORE="$(live_asset)"

COMMIT="$(git rev-parse HEAD)"
git push origin "$EXPECTED_BRANCH"

printf '\n  ============================================\n'
printf '   Git push succeeded\n'
printf '  ============================================\n'
printf '    commit  %s\n    branch  %s\n    remote  %s\n' \
  "$(git log -1 --format='%h %s' "$COMMIT")" "$EXPECTED_BRANCH" "$REMOTE_URL"
printf '\n  The site is NOT yet confirmed live. The host rebuilds on its own\n'
printf '  schedule; only the check below can say whether it has finished.\n'

if [ "$SKIP_VERIFY" = "1" ]; then
  printf '\n  --skip-verify: production verification not attempted.\n'
  printf '  Push succeeded; live status unknown.\n\n'
  exit 0
fi

step "Verifying the deployment on levantry.app"

if [ -z "$EXPECTED_ASSET" ]; then
  # Without a local fingerprint we can still tell that *something* rebuilt,
  # just not that it is this commit.
  printf '    No asset fingerprint in dist/ -- falling back to change detection.\n'
fi
printf '    expecting  %s\n' "${EXPECTED_ASSET:-<unknown>}"
printf '    live now   %s\n' "${ASSET_BEFORE:-<unreachable>}"

DEADLINE=$(( $(date +%s) + VERIFY_TIMEOUT_SECONDS ))
VERIFIED=0
REBUILT=0
HEALTHY=0
CURRENT=""

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  STATUS="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 15 "$PROD_URL" 2>/dev/null || echo '000')"
  if [ "$STATUS" = "200" ]; then
    HEALTHY=1
    CURRENT="$(live_asset)"
    if [ -n "$EXPECTED_ASSET" ] && [ "$CURRENT" = "$EXPECTED_ASSET" ]; then
      VERIFIED=1
      break
    fi
    if [ -n "$CURRENT" ] && [ -n "$ASSET_BEFORE" ] && [ "$CURRENT" != "$ASSET_BEFORE" ]; then
      REBUILT=1
      break
    fi
  fi
  printf '    ... still building (http %s), retrying in %ss\n' "$STATUS" "$VERIFY_INTERVAL_SECONDS"
  sleep "$VERIFY_INTERVAL_SECONDS"
done

printf '\n  ============================================\n'
if [ "$VERIFIED" = "1" ]; then
  printf '   Production deployment verified\n'
  printf '  ============================================\n'
  printf '    levantry.app is serving the bundle built from this commit.\n'
  printf '    asset  %s\n\n' "$CURRENT"
  exit 0
fi

if [ "$REBUILT" = "1" ]; then
  printf '   Production rebuilt -- fingerprint differs\n'
  printf '  ============================================\n'
  printf '    levantry.app rebuilt (asset changed since the push), but the\n'
  printf '    served bundle does not match the one built here:\n'
  printf '      expected  %s\n      serving   %s\n' "$EXPECTED_ASSET" "$CURRENT"
  printf '    The deploy landed; the mismatch usually means the host resolved\n'
  printf '    different dependencies. Worth a look, not an outage.\n\n'
  exit 0
fi

# A slow host is not a failed deploy. Say exactly what is and is not known.
printf '   Push succeeded -- production verification PENDING\n'
printf '  ============================================\n'
printf '    Waited %ss without seeing this build go live.\n' "$VERIFY_TIMEOUT_SECONDS"
if [ "$HEALTHY" = "1" ]; then
  printf '    levantry.app is up (http 200) but still serving %s.\n' "${CURRENT:-the previous bundle}"
  printf '    The host build is most likely still running.\n'
else
  printf '    levantry.app did not return http 200 during the wait.\n'
  printf '    Check the host build log before assuming this is only slowness.\n'
fi
printf '\n    The commit IS pushed. Re-check with:\n'
printf '      curl -s %s | grep -o "%s"\n' "$PROD_URL" "$asset_pattern"
printf '      expecting %s\n\n' "${EXPECTED_ASSET:-<unknown>}"

if [ "$STRICT_VERIFY" = "1" ]; then
  exit 1
fi
exit 0
