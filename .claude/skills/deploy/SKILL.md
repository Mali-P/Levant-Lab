---
name: deploy
description: Ship Levantry to levantry.app. Use whenever the user says deploy, ship it, push it live, or put it on the live app. Pushes to Levant-Lab main, then runs levantry-deploy on the VM — the push alone does not deploy.
---

# Deploying Levantry

**Canonical documentation: [docs/DEPLOYMENT.md](../../../docs/DEPLOYMENT.md).
Where this file and that one disagree, that one is right — it describes the
server as it actually is.**

## The deploy is two steps, and the second is the one that matters

```bash
git push origin main                        # 1. publish the commit
ssh levantry-vm sudo levantry-deploy main   # 2. deploy it
```

**Pushing to `main` does not deploy.** The host does not rebuild on push and
has no webhook. Skipping step 2 leaves production silently behind
`origin/main` — that is exactly how the server came to be six commits stale on
2026-08-08, because the push was treated as the deploy.

`levantry-vm` is the production SSH alias. The VM's other alias is the
co-tenant application's name, which the `block-forbidden-projects` hook
refuses on sight, so every command spelled that way fails before reaching the
network. Use `levantry-vm`; do not disable the hook and do not fall back to
the raw IP.

## Do not run scripts/deploy.sh

`scripts/deploy.sh` implements a **different architecture** that production
does not use: an rsync of `dist/` into `releases/<stamp>/` behind a `current`
symlink. Production is a git checkout at `/var/www/levantry` built in place
and served by `levantry.service`; nothing reads `current`.

It currently fails closed, because it requires a `.env.deploy` that does not
exist. Do not create one to make it run. Its `DEPLOY_PATH` defaults to
`/var/www/levantry`, and its path guard accepts that value — so a configured
run would write a `releases/` tree into the live checkout and prune it with
`rm -rf`, while the live site went on serving the old build.

The same applies to `scripts/provision-server.sh` and `deploy/nginx/`. They
describe the same unused model, and `provision-server.sh` installs a
`sites-available` vhost that would fight the live `conf.d` one.

## What levantry-deploy does

It fetches, fast-forwards (`--ff-only`, so a diverged checkout is refused
rather than quietly merged), runs `npm ci`, builds into `dist.new`, and swaps
it in **only after the build succeeds** — a broken build leaves the live site
untouched instead of emptying `dist/`. It then restarts the service and polls
`/api/ping`; if the health check fails it restores the previous build and
tells you to run `levantry-rollback`.

| command | effect |
| --- | --- |
| `sudo levantry-deploy [branch]` | pull, build, swap, restart, health-check (default `main`) |
| `sudo levantry-rollback [commit]` | return to the previously deployed commit |
| `levantry-status` | service, deployed commit, local ping, store, public URL |
| `levantry-logs` | journal for the service |

Never `npm ci --omit=dev` on the VM: the server runs under `tsx`, so
devDependencies must stay installed. See `docs/DEPLOYMENT.md`.

## Verifying, and what counts as verified

`levantry-deploy`'s health check proves the Node service came back up. It does
not prove the public site serves the new build. Report these as two separate
outcomes and never merge them:

- **Pushed** — the commit is on `Levant-Lab main`. True if `git push` returned 0.
- **Deployed and verified** — levantry.app is serving the bundle built from
  this commit. Only true after the check below passes.

Verification works off Vite's content-hashed asset names: take the
`assets/index-<hash>.js` from the local build and confirm the live page
references the same file.

```bash
curl -sS -o /dev/null -w "%{http_code} %{ssl_verify_result}\n" https://levantry.app/
curl -sS https://levantry.app/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
```

Expected: `200 0`, and a hash matching `dist/`. Because `levantry-deploy` is
synchronous, a mismatch here is a real problem — not a slow host build. Do not
report a deploy as pending; by the time the command returns, it has either
landed or rolled itself back. `/api/*` answering `401` without a token is
correct, not a fault.

## When to refuse to deploy

- **Dirty tree** — commit first. Do not commit on the user's behalf unless asked.
- **Wrong branch** — merge into `main` first; feature branches are not deployed.
- **Tests or build fail locally** — fix it first. The VM runs the same build,
  so a local failure is a failure that would abort the deploy anyway.

## Never the forbidden projects

This project must **never** read, write, build or deploy anything under the
five sibling directories in `C:\Projects` whose names begin with the
forbidden prefix (the publishing repos, the TTS repo and the vault-recovery
repo), or anything belonging to the co-tenant application on the VM.

Two independent things enforce it: the guards at the top of
`scripts/deploy.sh`, and the `PreToolUse` hook
`.claude/hooks/block-forbidden-projects.mjs`, which blocks any file or shell
tool call referencing those names. If a call is blocked, do not work around
it — say it was blocked and stop.

When confirming the co-tenant is still healthy after a Levantry change, use
signals that do not name it: `systemctl list-units --state=failed`,
`sudo nginx -t`, and the mtime of its vhost.

## Protected git operations

`.claude/hooks/guard-git-operations.mjs` gates the history-rewriting and
work-destroying git commands: `commit --amend`, `push --force`,
`reset --hard`, `clean -f`, discarding `checkout`/`switch`, and `rm -r`. The
first attempt at one is refused with a demand for facts; presenting them and
retrying is allowed.

It decides on the **operation, not the spelling**. The command text from
either shell is reduced to argv-style tokens and resolved to a canonical id
(`git.commit.amend`), so flag order, quoted or absolute executable paths,
`git.exe`, chained commands, subshells, and `bash -c` / `pwsh -Command` /
`cmd /c` wrappers all reach the same verdict. It is registered for **both**
the `Bash` and `PowerShell` matchers, and the session state is keyed by the
operation id — so switching tools neither bypasses the gate nor re-triggers
one already satisfied.

This exists because the upstream ECC GateGuard hook is registered for `Bash`
alone and has no PowerShell entry in its dispatch table: during a deploy,
`git commit --amend` was refused through Bash and accepted through
PowerShell. Regression tests for that exact bypass live in
`.claude/hooks/guard-git-operations.test.mjs` and run as part of `npm test`.
Do not narrow the matcher to one shell.

## What this is not

`cloudflared tunnel --url http://localhost:4180` in the README is a different
thing: it exposes the **local sync server** so a phone outside the house can
reach it. It is not how levantry.app is deployed, and this skill does not run
it.
