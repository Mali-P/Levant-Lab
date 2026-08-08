# Deploying Levantry

This is the canonical deployment document. `scripts/deploy.sh`,
`scripts/provision-server.sh` and `.env.deploy.example` all cite it by name.

## The one thing to know first

**`levantry-vm` is Levantry's production SSH alias. Always use it.**

```bash
ssh levantry-vm
```

The VM is shared with an unrelated co-tenant application, and that
application's name is also an SSH alias for the *same* machine in
`~/.ssh/config`. Levantry's `PreToolUse` hook
`.claude/hooks/block-forbidden-projects.mjs` refuses any shell command
containing that co-tenant's name — so the older alias makes **every**
deployment command fail with `BLOCKED: this Bash call references a forbidden
project`, before a packet ever leaves the machine.

That is a guard doing its job, not a fault. Do not disable the hook, do not
edit its pattern, and do not substitute the raw IP to get around it. Use
`levantry-vm`.

```
Host levantry-vm
  HostName 82.70.221.152
  User ubuntu
  Port 22
  IdentityFile C:\Users\<you>\.ssh\oracle_pesto_mali
  IdentitiesOnly yes
```

The key lives outside the repository and is never committed. It is the same
key `.env.deploy.example` now names; that file previously defaulted
`DEPLOY_KEY` to `~/.ssh/oracle_cl_master`, which does not exist on this
workstation.

The alias is a rename, not a bypass. It resolves to the same host, user, port
and key as the older one — what changes is only that the command text no
longer contains the co-tenant's name, so nothing about it grants access that
was not already there. Note the consequence, though: commands that *name* the
co-tenant are refused even when they only read its status, which is why the
verification recipes below deliberately avoid naming it.

## DNS

`levantry.app` is registered at Namecheap and uses its BasicDNS nameservers
(`dns1.registrar-servers.com`, `dns2.registrar-servers.com`). Two A records,
both pointing at the VM:

| host | type | value |
| --- | --- | --- |
| `@` | A | `82.70.221.152` |
| `www` | A | `82.70.221.152` |

There is no CNAME and no proxy in front, so nginx sees real client addresses
and Certbot's HTTP-01 challenge resolves to the same machine that answers it.

**`.app` is on the HSTS preload list** baked into Chrome, Safari, Firefox and
Edge. Browsers rewrite `http://levantry.app` to `https://` before a request
leaves the machine, and no one can click through a certificate warning. A
working port-80 response therefore proves nothing about whether real users can
reach the site — between DNS going live and the certificate being issued on
2026-08-08, `curl http://levantry.app` returned 200 while every browser
refused to load the site. Never verify this domain over plain HTTP.

## How a deploy actually happens

**Pushing to `main` does not deploy.** The host does not rebuild on push.
A deploy is a command you run on the VM:

```bash
git push origin main                        # 1. publish the commit
ssh levantry-vm sudo levantry-deploy main   # 2. deploy it
```

Skipping step 2 leaves production silently behind `origin/main` — that is
exactly how the server came to be six commits stale on 2026-08-08.

`levantry-deploy` fetches, fast-forwards (`--ff-only`, so a diverged checkout
is refused rather than quietly merged), runs `npm ci`, builds into
`dist.new`, and swaps it in **only after the build succeeds** — a broken build
leaves the live site untouched instead of emptying `dist/`. It then restarts
the service and polls `/api/ping`; if the health check fails it restores the
previous build automatically and tells you to run `levantry-rollback`.

| command | effect |
| --- | --- |
| `sudo levantry-deploy [branch]` | pull, build, swap, restart, health-check (default `main`) |
| `sudo levantry-rollback [commit]` | return to the previously deployed commit |
| `levantry-status` | service, deployed commit, local ping, store, public URL |
| `levantry-logs` | journal for the service |

`levantry-status` is the only one of these that needs no `sudo`. It reaches
the checkout and the store as `levantry` internally (`sudo -u levantry git -C
...`, `sudo ls`), because `/var/www/levantry` is owned by `levantry` and
`/var/lib/levantry` is mode `0750` — running those as the invoking user gets
`detected dubious ownership` and `Permission denied` instead of the answer.

## What is on the VM

| thing | path |
| --- | --- |
| Code | `/var/www/levantry` — git clone of `origin/main`, owner `levantry` |
| Built frontend | `/var/www/levantry/dist` (previous build kept as `dist.prev`) |
| Persistent sync data | `/var/lib/levantry/` — deliberately outside the repo |
| Env and secret | `/etc/levantry.env` — `root:levantry`, mode `0640` |
| Service | `levantry.service`, bound to `127.0.0.1:4180` only |
| Nginx vhost | `/etc/nginx/conf.d/levantry.conf` |
| TLS | `/etc/letsencrypt/live/levantry.app/` |

Three constraints that are not obvious from the code:

1. **devDependencies must stay installed in production.** `server/store.ts`
   uses a constructor parameter property, which is not erasable syntax, so
   Node 22's type stripping cannot run the server alone. It runs as
   `node --import tsx ./server/index.ts`, and vite builds the frontend.
   Never `npm ci --omit=dev`.
2. **`client_max_body_size 64m`.** The sync server's `MAX_BODY_BYTES` is
   64 MB; nginx's 1 MB default would silently 413 a full device push.
3. **The vhost filename must sort after the co-tenant's.** nginx treats the
   first server block it loads for a listen address as that address's default
   server, so `levantry.conf` sorting later keeps the co-tenant handling
   unmatched hosts exactly as before.

`/etc/levantry.env` pins `LEVANTRY_SYNC_TOKEN` rather than generating it, so a
rebuild can never mint a new secret and lock an installed phone out of sync.

## TLS

One certificate, lineage `levantry.app`, covers both `levantry.app` and
`www.levantry.app` (issued 2026-08-08, valid to 2026-11-06). It is deliberately
**separate** from the co-tenant's certificate — `--cert-name levantry.app`
keeps them independent lineages, so renewing or revoking one cannot disturb
the other. Certbot's `--redirect` installed the HTTP→HTTPS 301s in the vhost;
`www` then redirects to the apex over HTTPS.

Renewal is handled by the **nginx** authenticator (see
`/etc/letsencrypt/renewal/levantry.app.conf`) driven by the enabled
`certbot.timer` — not by the webroot. The `/.well-known/acme-challenge/`
blocks in the vhost pointing at `/var/www/certbot` are vestigial; that
directory is empty and nothing writes to it.

To check renewal without touching the co-tenant's certificate, always scope it:

```bash
ssh levantry-vm 'sudo certbot renew --cert-name levantry.app --dry-run'
```

An unscoped `certbot renew` would simulate the co-tenant's certificate too.
`certbot renew` also sleeps a random delay of up to ~8 minutes before doing
anything, so a dry run that appears to hang is usually just waiting.

## Verifying a deploy

`levantry-deploy`'s own health check proves the Node service came back up. It
does not prove the public site is right. Check that separately:

```bash
curl -sS -o /dev/null -w "%{http_code} %{ssl_verify_result}\n" https://levantry.app/
curl -sSL -o /dev/null -w "%{url_effective}\n" http://www.levantry.app/
```

Expected: `200 0` for the apex, and `http://www` → `https://www` →
`https://levantry.app/` for the redirect chain. `/api/*` answering `401`
without a token is correct, not a fault.

## Do not touch the co-tenant

Levantry may never read, write, build or deploy anything belonging to the
other application on this VM, or to the sibling repositories in `C:\Projects`
whose names begin with the forbidden prefix. Two independent things enforce
it: the guards at the top of `scripts/deploy.sh`, and the
`block-forbidden-projects.mjs` hook. If a call is blocked, do not work around
it — say it was blocked and stop.

When verifying the co-tenant is still healthy after a Levantry change, use
signals that do not require reading its files: `systemctl list-units
--state=failed`, `sudo nginx -t`, and the mtime of its vhost.

## Scripts that do not match this document

`scripts/provision-server.sh`, `deploy/nginx/levantry.conf` and the
uncommitted rewrite of `scripts/deploy.sh` describe a **different**
architecture — a `releases/` tree with a `current` symlink, an
`/etc/nginx/sites-available/` vhost and rsync'd `dist/` uploads. That model is
not what runs in production, and running those scripts would fight the live
setup. (`.claude/skills/deploy/SKILL.md` described a third model, in which
pushing to `main` is itself the deploy; it has since been rewritten to match
this document.)

Be precise about how `deploy.sh` is dangerous, because it is not merely
useless. `DEPLOY_PATH` defaults to `/var/www/levantry` — the live checkout —
and the script's own safety guard accepts that value, since it only refuses
paths outside `/var/www/levantry*`. A configured run would rsync a
`releases/<stamp>/` tree into the running checkout, flip a `current` symlink
nothing reads, and prune old releases with `rm -rf`, all while nginx went on
serving the untouched `dist/`. It would look like a successful deploy and
change nothing a user could see.

The only reason this has never fired is that the script requires a
`.env.deploy` that does not exist, so it dies at `DEPLOY_HOST is not set`.
**Creating that file is what arms it.** `.env.deploy.example` now carries this
warning at the top rather than inviting you to copy it.

Reconcile or delete these before trusting any of them. This document describes
the server as it actually is.
