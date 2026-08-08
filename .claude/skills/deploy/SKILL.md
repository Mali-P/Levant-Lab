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

Add `--dry-run` to do everything except the push.

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
