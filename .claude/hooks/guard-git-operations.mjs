// Gate the history-rewriting and work-destroying git operations, whatever
// shell they arrive in.
//
// The problem this exists to solve: the upstream GateGuard hook is registered
// for the Bash tool only, and its dispatch table has no PowerShell entry, so
// `git commit --amend` was refused through Bash and waved through when the
// same operation was retyped for the PowerShell tool. A guard that a change of
// tool defeats is not a guard.
//
// So the decision here is made on the *operation*, never on the spelling. Both
// shells' command text is reduced to a list of argv-style token arrays, each
// resolved down to a canonical operation id (`git.commit.amend`), and the
// policy is applied to that id. `git commit --amend`,
// `git --no-pager commit -a --amend --no-edit`,
// `& "C:\Program Files\Git\bin\git.exe" commit --amend` and
// `pwsh -EncodedCommand <base64>` all reduce to the same id and get the same
// answer.
//
// Policy is first-touch deny, retry allow -- matching the upstream gate: the
// first attempt at an operation is refused with a demand for facts, and the
// same operation is permitted once those facts have been presented. The
// session key is the canonical operation id, so facts presented for an amend
// in Bash also satisfy the amend in PowerShell. Two shells, one gate, one
// answer.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

// Shells whose `-c` / `-Command` payload is itself a command line we must
// re-enter. Without this, `bash -c "git commit --amend"` hides the operation
// inside a string argument.
const POSIX_SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const POWERSHELL_SHELLS = new Set(["pwsh", "powershell"]);
const CMD_SHELLS = new Set(["cmd"]);

const MAX_WRAPPER_DEPTH = 5;

// --- Reduction to token arrays ------------------------------------------

// Substitutions run as commands in their own right, in both dialects:
// POSIX `$(...)` and backticks, PowerShell `$(...)`, `@(...)` and `&{...}`.
// Promoting their bodies to top-level segments means the operation inside is
// classified rather than skipped over.
function explodeSubexpressions(input) {
  let out = String(input ?? "");
  for (let i = 0; i < MAX_WRAPPER_DEPTH; i += 1) {
    const before = out;
    out = out.replace(/[$@&]\(([^()]*)\)/g, ";$1;");
    out = out.replace(/&\{([^{}]*)\}/g, ";$1;");
    out = out.replace(/`([^`]*)`/g, ";$1;");
    if (out === before) break;
  }
  return out;
}

const SEPARATORS = new Set([";", "|", "&", "\n", "\r"]);

// One tokenizer for both dialects. The escape rules differ -- POSIX uses
// backslash, PowerShell uses backtick -- so both are honoured. Treating a
// Windows path separator as an escape would corrupt `C:\Git\git.exe`, so a
// backslash only escapes when it precedes a character that could plausibly be
// escaped, never a bare path character.
function tokenizeSegments(input) {
  const segments = [];
  let words = [];
  let current = "";
  let hasWord = false;
  let quote = null;

  const flushWord = () => {
    if (hasWord) words.push(current);
    current = "";
    hasWord = false;
  };
  const flushSegment = () => {
    flushWord();
    if (words.length) segments.push(words);
    words = [];
  };

  const text = explodeSubexpressions(input);

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "\\" && quote !== "'" && (next === '"' || next === "\\" || next === "'")) {
      current += next;
      hasWord = true;
      i += 1;
      continue;
    }
    if (ch === "`" && quote !== "'" && next !== undefined) {
      current += next;
      hasWord = true;
      i += 1;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      hasWord = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      hasWord = true;
      continue;
    }
    if (SEPARATORS.has(ch)) {
      flushSegment();
      continue;
    }
    if (/\s/.test(ch)) {
      flushWord();
      continue;
    }
    current += ch;
    hasWord = true;
  }
  flushSegment();
  return segments;
}

// `/usr/bin/git`, `C:\Program Files\Git\bin\git.exe`, `GIT` and a quoted
// `"git"` are one program. Quotes are already gone by this point.
function commandBasename(token) {
  if (!token) return "";
  return String(token)
    .replace(/^.*[\\/]/, "")
    .replace(/\.exe$/i, "")
    .toLowerCase();
}

// PowerShell's call operators (`&`, `.`) and POSIX per-command environment
// assignments (`GIT_DIR=... git ...`) sit in front of the real command word.
function stripInvocationPrefix(tokens) {
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "&" || t === ".") {
      i += 1;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
      i += 1;
      continue;
    }
    break;
  }
  return tokens.slice(i);
}

// PowerShell can carry a whole command line as base64 UTF-16LE. Decoding it
// is the difference between a real guard and one that a flag defeats.
function decodeEncodedCommand(value) {
  try {
    const buf = Buffer.from(String(value), "base64");
    if (buf.length === 0 || buf.length % 2 !== 0) return null;
    return buf.toString("utf16le");
  } catch {
    return null;
  }
}

function isEncodedCommandFlag(token) {
  return /^-(?:e|ec|encodedcommand)$/i.test(String(token).replace(/^--/, "-"));
}

function isCommandFlag(token) {
  return /^-(?:c|command)$/i.test(String(token).replace(/^--/, "-"));
}

// Collect every argv-style command reachable from the raw text, following
// nested shell wrappers in either dialect.
function collectCommands(raw, depth = 0) {
  if (depth > MAX_WRAPPER_DEPTH) return [];
  const out = [];

  for (const rawTokens of tokenizeSegments(raw)) {
    const tokens = stripInvocationPrefix(rawTokens);
    if (tokens.length === 0) continue;
    out.push(tokens);

    const base = commandBasename(tokens[0]);
    const rest = tokens.slice(1);

    if (POSIX_SHELLS.has(base)) {
      const ci = rest.findIndex((t) => t === "-c");
      if (ci !== -1 && rest[ci + 1]) out.push(...collectCommands(rest[ci + 1], depth + 1));
    } else if (POWERSHELL_SHELLS.has(base)) {
      for (let i = 0; i < rest.length; i += 1) {
        if (isCommandFlag(rest[i]) && rest[i + 1]) {
          // `-Command` may be followed by the rest of the line as separate words.
          out.push(...collectCommands(rest.slice(i + 1).join(" "), depth + 1));
        } else if (isEncodedCommandFlag(rest[i]) && rest[i + 1]) {
          const decoded = decodeEncodedCommand(rest[i + 1]);
          if (decoded) out.push(...collectCommands(decoded, depth + 1));
        }
      }
    } else if (CMD_SHELLS.has(base)) {
      const ci = rest.findIndex((t) => /^\/[ck]$/i.test(t));
      if (ci !== -1 && rest[ci + 1]) {
        out.push(...collectCommands(rest.slice(ci + 1).join(" "), depth + 1));
      }
    }
  }

  return out;
}

// --- Classification ------------------------------------------------------

// git's global options sit between the program and the subcommand, and some
// of them take a value. Skipping them correctly is what makes
// `git -c core.pager=cat commit --amend` resolve to `commit`.
const GIT_VALUE_OPTIONS = new Set(["-c", "-C", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--exec-path"]);

function findGitSubcommand(tokens) {
  if (tokens.length === 0 || commandBasename(tokens[0]) !== "git") return null;
  let i = 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (GIT_VALUE_OPTIONS.has(t)) {
      i += 2;
      continue;
    }
    if (t.startsWith("-")) {
      i += 1;
      continue;
    }
    return { command: t.toLowerCase(), rest: tokens.slice(i + 1) };
  }
  return null;
}

// A short flag cluster (`-fd`) carries each of its letters.
function hasShortFlag(tokens, letter) {
  return tokens.some((t) => t.startsWith("-") && !t.startsWith("--") && t.slice(1).includes(letter));
}

// Every check below scans the whole argument list, so flag order never
// changes the verdict.
function classifyGitOperation(tokens) {
  const sub = findGitSubcommand(tokens);
  if (!sub) return null;
  const { command, rest } = sub;

  if (command === "commit" && rest.includes("--amend")) return "git.commit.amend";

  if (command === "reset" && rest.includes("--hard")) return "git.reset.hard";

  if (command === "push") {
    // Only --force-with-lease is a safety-checked force. --force-if-includes
    // is a no-op on its own, so it does not redeem a bare --force.
    const withLease = rest.some((t) => t === "--force-with-lease" || t.startsWith("--force-with-lease="));
    const bareForce = rest.some((t) => t === "--force" || t.startsWith("--force=")) || hasShortFlag(rest, "f");
    // A `+` refspec forces a non-fast-forward update on its own.
    const plusRefspec = rest.some((t) => t.length > 1 && /^\+(?:[a-zA-Z_/.:]|HEAD)/.test(t));
    if (bareForce || (plusRefspec && !withLease)) return "git.push.force";
    return null;
  }

  if (command === "clean" && (rest.includes("--force") || hasShortFlag(rest, "f"))) return "git.clean.force";

  if (command === "checkout") {
    const discards = rest.some((t) => t === "--" || t === "." || t === "--force") || hasShortFlag(rest, "f");
    return discards ? "git.checkout.discard" : null;
  }

  if (command === "switch") {
    const discards =
      rest.some((t) => t === "--discard-changes" || t === "--force") || hasShortFlag(rest, "f") || hasShortFlag(rest, "C");
    return discards ? "git.switch.discard" : null;
  }

  if (command === "rm" && (hasShortFlag(rest, "r") || rest.includes("--recursive"))) return "git.rm.recursive";

  return null;
}

// The exported seam the tests drive: raw command text in, sorted canonical
// operation ids out. Shell-independent by construction.
export function detectProtectedOperations(command) {
  const found = new Set();
  for (const tokens of collectCommands(String(command ?? ""))) {
    const op = classifyGitOperation(tokens);
    if (op) found.add(op);
  }
  return [...found].sort();
}

const OPERATION_LABELS = {
  "git.commit.amend": "git commit --amend (rewrites the last commit)",
  "git.reset.hard": "git reset --hard (discards working-tree changes)",
  "git.push.force": "git push --force (overwrites remote history)",
  "git.clean.force": "git clean -f (deletes untracked files)",
  "git.checkout.discard": "git checkout (discards working-tree changes)",
  "git.switch.discard": "git switch (discards working-tree changes)",
  "git.rm.recursive": "git rm -r (deletes tracked files)",
};

export function gateMessage(operations, tool) {
  const listed = operations.map((op) => `  - ${OPERATION_LABELS[op] ?? op}`).join("\n");
  return [
    "[Protected Git Operation]",
    "",
    `Blocked a protected operation reached through the ${tool} tool:`,
    "",
    listed,
    "",
    "Before running this, present these facts:",
    "",
    "1. What exactly this rewrites, discards or deletes",
    "2. A one-line recovery procedure if it goes wrong",
    "3. Quote the user's current instruction verbatim",
    "",
    "Present the facts, then retry the same operation.",
    "",
    "This gate is keyed to the operation, not to the shell: switching between",
    "the Bash and PowerShell tools reaches the same gate and the same state.",
  ].join("\n");
}

// --- Session state -------------------------------------------------------

const STATE_DIR = process.env.LEVANTRY_GIT_GUARD_STATE_DIR || path.join(os.tmpdir(), "levantry-git-guard");
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function sessionKey(payload) {
  const raw = payload?.session_id ?? payload?.sessionId ?? process.env.CLAUDE_SESSION_ID ?? "default";
  return crypto.createHash("sha256").update(String(raw)).digest("hex").slice(0, 24);
}

function stateFileFor(payload) {
  return path.join(STATE_DIR, `state-${sessionKey(payload)}.json`);
}

function loadChecked(file) {
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - (state.last_active ?? 0) > SESSION_TIMEOUT_MS) return [];
    return Array.isArray(state.checked) ? state.checked : [];
  } catch {
    return [];
  }
}

// Returns the operations that were seen for the first time. A failed write
// yields null, and the caller allows rather than looping forever on a gate it
// can never satisfy.
function recordOperations(payload, operations) {
  const file = stateFileFor(payload);
  const existing = loadChecked(file);
  const fresh = operations.filter((op) => !existing.includes(op));
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ checked: [...new Set([...existing, ...operations])], last_active: Date.now() }), "utf8");
    fs.renameSync(tmp, file);
  } catch {
    return null;
  }
  return fresh;
}

// --- Decision ------------------------------------------------------------

// Pure decision function, exported so the tests can assert the Bash and
// PowerShell verdicts without touching the filesystem.
export function decide(payload, { alreadyChecked = [] } = {}) {
  const tool = payload?.tool_name ?? "";
  if (!SHELL_TOOLS.has(tool)) return { action: "allow", operations: [] };

  const command = payload?.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return { action: "allow", operations: [] };

  const operations = detectProtectedOperations(command);
  if (operations.length === 0) return { action: "allow", operations: [] };

  const fresh = operations.filter((op) => !alreadyChecked.includes(op));
  if (fresh.length === 0) return { action: "allow", operations };

  return { action: "block", operations: fresh, message: gateMessage(fresh, tool) };
}

// --- Hook entry point ----------------------------------------------------

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      process.exit(0); // Unparseable payload is not this hook's business.
    }

    const tool = payload.tool_name ?? "";
    if (!SHELL_TOOLS.has(tool)) process.exit(0);

    const command = payload.tool_input?.command;
    if (typeof command !== "string" || !command.trim()) process.exit(0);

    const operations = detectProtectedOperations(command);
    if (operations.length === 0) process.exit(0);

    const fresh = recordOperations(payload, operations);
    if (fresh === null) {
      process.stderr.write("[Protected Git Operation] state could not be persisted; allowing to avoid a retry loop.\n");
      process.exit(0);
    }
    if (fresh.length === 0) process.exit(0); // Facts already presented for these.

    process.stderr.write(`${gateMessage(fresh, tool)}\n`);
    process.exit(2);
  });
}

// Only run the hook when executed directly, so the test can import the module.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
