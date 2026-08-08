---
name: deploy
description: Ship Levantry to levantry.app. Use whenever the user says deploy, ship it, push it live, or put it on the live app. Runs the guarded deploy script — tests, build, then push to Levant-Lab main, which is what the host builds from.
---

# Deploying Levantry

levantry.app is served by a host wired to the GitHub repo
`Mali-P/Levant-Lab`. There is no build artefact in the repo (`dist/` is
git-ignored) and no CI workflow: **the host builds from source on every push
to `main`, so pushing to `main` is the deploy.**

## The one command

```bash
bash scripts/deploy.sh
```

| flag | effect |
| --- | --- |
| `--dry-run` | everything except the push |
| `--skip-verify` | push, but do not wait for the host rebuild |
| `--strict-verify` | exit non-zero if the deploy cannot be verified live |

## A push is not a deploy

`git push` returning 0 proves the commit reached GitHub. It proves nothing
about levantry.app, because the host rebuilds on its own schedule. The script
therefore reports two separate outcomes, and you must not merge them when
telling the user what happened:

- **Git push succeeded** — the commit is on `Levant-Lab main`. Always true if
  the push step completed.
- **Production deployment verified** — levantry.app is serving the bundle
  built from this commit. Only true if the check below passed.

Verification works off Vite's content-hashed asset names. The script records
the `assets/index-<hash>.js` that the local build produced, then polls
levantry.app for up to 180s until the live page serves that same file.
`package-lock.json` is committed, so the host resolves the same dependencies
and lands on the same hash. Three outcomes:

- **verified** — served hash matches the built hash.
- **rebuilt, fingerprint differs** — the site changed but not to our hash,
  usually dependency drift on the host. The deploy landed; worth a look.
- **PENDING** — the timeout passed without the new bundle appearing. This is
  *not* reported as a failed deploy, because a slow host build is normal. Say
  "pushed, not yet verified live" and re-check, rather than either claiming
  success or declaring a failure.

If verification stays pending long after a deploy, suspect the host build
rather than the push — confirm with `git ls-remote origin refs/heads/main`
against local `HEAD`, and if they match, the problem is downstream of git.

The script refuses to run unless all of these hold, and prints why when it
refuses:

- the checkout is not under a forbidden path (see below)
- no forbidden remote is configured
- `origin` is exactly `https://github.com/Mali-P/Levant-Lab.git`
- `package.json` name is `levantry`
- the branch is `main`
- the working tree is clean
- `npm test` passes
- `npm run build` passes — the same command the host runs, so a failure here
  is a failure that would have broken the live site

## Never the forbidden projects

This project must **never** read, write, build or deploy anything under the
five sibling directories in `C:\Projects` whose names begin with the
forbidden prefix (the publishing repos, the TTS repo and the vault-recovery
repo).

Two independent things enforce it: the guards at the top of
`scripts/deploy.sh`, and the `PreToolUse` hook
`.claude/hooks/block-forbidden-projects.mjs`, which blocks any file or shell
tool call referencing those paths. If a call is blocked, do not work around
it — say it was blocked and stop.

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

## When it refuses

- **Dirty tree** — commit first, then deploy. Do not commit on the user's
  behalf unless asked.
- **Wrong branch** — merge into `main` first; feature branches are not
  deployed.
- **Tests or build fail** — fix the failure. Never push past it: the host
  would run the same build and the deploy would fail on the live site.

## What this is not

`cloudflared tunnel --url http://localhost:4180` in the README is a different
thing: it exposes the **local sync server** so a phone outside the house can
reach it. It is not how levantry.app is deployed, and this skill does not run
it.
