#!/usr/bin/env bash
#
# One-time server provisioning for Levantry.
# Canonical deployment documentation: docs/DEPLOYMENT.md
#
# Creates Levantry's own directory tree on the shared VM, installs Levantry's
# nginx server block, and makes sure levantry.app has its own TLS certificate.
# Run this once; after that ./scripts/deploy.sh is all you need.
#
#   ./scripts/provision-server.sh            inspect and report; change nothing
#   ./scripts/provision-server.sh --apply    make the changes
#
# The VM hosts other applications. This script only ever writes to Levantry's
# own paths, and it refuses to touch an nginx file it cannot prove belongs to
# Levantry -- it stops and tells you rather than edit a shared config.
#
set -euo pipefail
export MSYS2_ARG_CONV_EXCL='*'
export MSYS_NO_PATHCONV=1

APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    *) printf 'unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

die()  { printf '\n  STOPPING\n  %s\n\n' "$1" >&2; exit 1; }
step() { printf '\n  -> %s\n' "$1"; }

cd "$(dirname "$0")/.."

if [ -f .env.deploy ]; then
  # shellcheck disable=SC1091
  . ./.env.deploy
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/levantry}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/oracle_cl_master}"

NGINX_SITE="levantry.conf"
CERT_NAME="levantry.app"

[ -n "$DEPLOY_HOST" ] || die "DEPLOY_HOST is not set. Copy .env.deploy.example to .env.deploy."

case "$DEPLOY_PATH" in
  /var/www/levantry|/var/www/levantry-*) ;;
  *) die "DEPLOY_PATH is '$DEPLOY_PATH'. Only Levantry's own directory is allowed." ;;
esac

printf '\n  Levantry server provisioning\n'
printf '  Documentation:  docs/DEPLOYMENT.md\n'
printf '  Server:         %s@%s\n' "$DEPLOY_USER" "$DEPLOY_HOST"
printf '  Levantry path:  %s\n' "$DEPLOY_PATH"
printf '  Nginx site:     /etc/nginx/sites-available/%s\n' "$NGINX_SITE"
[ "$APPLY" = "1" ] || printf '  Mode:           REPORT ONLY (pass --apply to make changes)\n'

SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -p "$DEPLOY_PORT")
[ -f "$DEPLOY_KEY" ] && SSH_OPTS+=(-i "$DEPLOY_KEY")
remote() { ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "$@"; }

# ---------------------------------------------------------------------------
step "Checking the connection"
remote 'echo "    connected as $(whoami)@$(hostname)"; nginx -v 2>&1 | sed "s/^/    /"'

# ---------------------------------------------------------------------------
# Something already answers for levantry.app, so before installing anything we
# find out which nginx file owns that name. Only filenames are read here; the
# contents of a file that is not demonstrably Levantry's are never opened.
# ---------------------------------------------------------------------------
step "Finding which nginx file currently serves levantry.app"

OWNERS="$(remote "grep -rl -e 'levantry\.app' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | xargs -r -n1 readlink -f | sort -u" || true)"

if [ -z "$OWNERS" ]; then
  printf '    No existing nginx file mentions levantry.app.\n'
else
  printf '%s\n' "$OWNERS" | sed 's/^/    /'
fi

FOREIGN=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$(basename "$f")" in
    *levantry*) ;;
    *) FOREIGN=1 ;;
  esac
done <<EOF
$OWNERS
EOF

if [ "$FOREIGN" = "1" ]; then
  printf '\n  STOPPING\n'
  printf '  levantry.app is currently served from an nginx file that is not\n'
  printf '  named for Levantry (listed above). That file may belong to another\n'
  printf '  application on this VM, and this script will not open or edit it.\n\n'
  printf '  Move the levantry.app server blocks out of that file by hand, then\n'
  printf '  re-run this script. See docs/DEPLOYMENT.md.\n\n'
  exit 1
fi

# ---------------------------------------------------------------------------
step "Checking TLS for $CERT_NAME"
remote "
  if [ -d /etc/letsencrypt/live/$CERT_NAME ]; then
    echo '    certificate present:'
    sudo openssl x509 -in /etc/letsencrypt/live/$CERT_NAME/fullchain.pem \
      -noout -subject -dates -ext subjectAltName 2>/dev/null | sed 's/^/      /'
  else
    echo '    no certificate for $CERT_NAME yet'
  fi
"

if [ "$APPLY" != "1" ]; then
  printf '\n    Report only. Re-run with --apply to create directories, install\n'
  printf '    the nginx site and obtain a certificate if one is missing.\n\n'
  exit 0
fi

# ---------------------------------------------------------------------------
step "Creating Levantry's directory tree"
remote "
  set -eu
  P='$DEPLOY_PATH'
  case \"\$P\" in /var/www/levantry|/var/www/levantry-*) ;; *) echo 'refused'; exit 1;; esac
  sudo mkdir -p \"\$P/releases\" \"\$P/acme/.well-known/acme-challenge\"
  sudo chown -R $DEPLOY_USER:$DEPLOY_USER \"\$P\"
  sudo chmod 755 \"\$P\"
  # A placeholder release means nginx has something to serve the moment its
  # config is installed, even before the first real deploy.
  if [ ! -e \"\$P/current\" ]; then
    mkdir -p \"\$P/releases/00000000T000000Z\"
    echo '<!doctype html><title>Levantry</title><p>Not deployed yet.' \
      > \"\$P/releases/00000000T000000Z/index.html\"
    ln -sfn \"\$P/releases/00000000T000000Z\" \"\$P/current\"
  fi
  ls -la \"\$P\" | sed 's/^/    /'
"

# ---------------------------------------------------------------------------
step "Installing Levantry's nginx server block"

# Uploaded to a staging path in Levantry's own tree first, so the privileged
# copy is a single reviewable command with a fixed destination filename.
remote "cat > \"$DEPLOY_PATH/$NGINX_SITE.new\"" < deploy/nginx/levantry.conf
remote "
  set -eu
  sudo install -o root -g root -m 644 \
    '$DEPLOY_PATH/$NGINX_SITE.new' '/etc/nginx/sites-available/$NGINX_SITE'
  rm -f '$DEPLOY_PATH/$NGINX_SITE.new'
  sudo ln -sfn '/etc/nginx/sites-available/$NGINX_SITE' '/etc/nginx/sites-enabled/$NGINX_SITE'
  echo '    installed /etc/nginx/sites-available/$NGINX_SITE'
"

step "Validating the nginx configuration"
if ! remote 'sudo nginx -t 2>&1 | sed "s/^/    /"'; then
  die "nginx -t failed. Nothing was reloaded; the previous configuration is still live."
fi

step "Reloading nginx"
remote 'sudo systemctl reload nginx && echo "    reloaded"'

# ---------------------------------------------------------------------------
step "Ensuring $CERT_NAME has its own certificate"
remote "
  set -eu
  if [ -d /etc/letsencrypt/live/$CERT_NAME ]; then
    echo '    certificate already exists; leaving it alone'
  else
    sudo certbot certonly --webroot -w '$DEPLOY_PATH/acme' \
      -d $CERT_NAME -d www.$CERT_NAME \
      --cert-name $CERT_NAME --non-interactive --agree-tos --register-unsafely-without-email
    sudo nginx -t && sudo systemctl reload nginx
  fi
  systemctl list-timers 2>/dev/null | grep -i certbot | sed 's/^/    /' || true
"

printf '\n  ============================================\n'
printf '   Provisioning complete\n'
printf '  ============================================\n'
printf '    Now run: ./scripts/deploy.sh\n\n'
