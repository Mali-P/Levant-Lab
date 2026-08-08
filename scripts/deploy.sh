#!/usr/bin/env bash
#
# Deploy Levantry to levantry.app.
#
# levantry.app is served by a host wired to the GitHub repo, so a push to
# main IS the deploy: the host builds from source on every push. This script
# does the checking that a bare `git push` does not, and refuses to run at all
# if anything about the target looks wrong.
#
#   ./scripts/deploy.sh              build, test, push
#   ./scripts/deploy.sh --dry-run    everything except the push
#
set -euo pipefail

EXPECTED_REMOTE="https://github.com/Mali-P/Levant-Lab.git"
EXPECTED_BRANCH="main"
EXPECTED_PACKAGE="levantry"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

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

git push origin "$EXPECTED_BRANCH"

printf '\n  Pushed. The host is building now; levantry.app updates in a minute or two.\n\n'
