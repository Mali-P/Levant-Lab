// Regression tests for the shell-independence of the git operation gate.
//
// The bug these exist to prevent: during the levantry.app deploy,
// `git commit --amend` was refused through the Bash tool and accepted through
// the PowerShell tool. The upstream GateGuard hook is registered with
// `"matcher": "Bash"` and dispatches on a lookup table containing only
// edit/write/multiedit/bash, so a PowerShell tool call never reached the
// policy at all. Same operation, different tool, opposite answer.

import { describe, expect, it } from "vitest";

import { decide, detectProtectedOperations } from "./guard-git-operations.mjs";

const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
const pwsh = (command) => ({ tool_name: "PowerShell", tool_input: { command } });

// A faithful model of the behaviour we are regressing against: gate on the
// Bash tool, fall through to "allow" for anything else. Kept in the test as
// the thing being disproved, so the inconsistency is stated in code rather
// than only in a commit message.
function legacyShellDependentDecision(payload) {
  const TOOL_MAP = { edit: "Edit", write: "Write", multiedit: "MultiEdit", bash: "Bash" };
  const toolName = TOOL_MAP[String(payload.tool_name).toLowerCase()] ?? payload.tool_name;
  if (toolName !== "Bash") return "allow";
  return /git\s+commit\s+--amend/.test(payload.tool_input.command) ? "block" : "allow";
}

describe("the deploy-day inconsistency", () => {
  const command = "git commit --amend --no-edit";

  it("is reproduced by the legacy shell-dependent dispatch", () => {
    // This is the exact defect: Bash blocked, PowerShell allowed.
    expect(legacyShellDependentDecision(bash(command))).toBe("block");
    expect(legacyShellDependentDecision(pwsh(command))).toBe("allow");
  });

  it("is gone from the operation-keyed gate: both shells block", () => {
    expect(decide(bash(command)).action).toBe("block");
    expect(decide(pwsh(command)).action).toBe("block");
  });

  it("resolves both shells to the same canonical operation", () => {
    expect(decide(bash(command)).operations).toEqual(["git.commit.amend"]);
    expect(decide(pwsh(command)).operations).toEqual(["git.commit.amend"]);
  });

  it("lets facts presented in one shell satisfy the gate in the other", () => {
    // Facts presented against a Bash attempt must carry to PowerShell,
    // otherwise the two shells still have separate policies.
    const satisfied = { alreadyChecked: ["git.commit.amend"] };
    expect(decide(bash(command), satisfied).action).toBe("allow");
    expect(decide(pwsh(command), satisfied).action).toBe("allow");
  });
});

describe("equivalent spellings of the same operation", () => {
  // Every one of these is `git commit --amend` wearing a different coat.
  const spellings = [
    ["plain", "git commit --amend"],
    ["flags reordered", "git commit --no-edit --amend -a"],
    ["message flag first", 'git commit -m "wip" --amend'],
    ["git global option", "git -c core.pager=cat commit --amend"],
    ["repo-path global option", "git -C . commit --amend"],
    ["absolute posix path", "/usr/bin/git commit --amend"],
    // Unquoted, so no spaces -- a path with spaces must be quoted to run at
    // all, and that form is covered on the next line.
    ["windows exe path", "C:\\tools\\git\\bin\\git.exe commit --amend"],
    ["quoted windows exe path", '"C:\\Program Files\\Git\\bin\\git.exe" commit --amend'],
    ["powershell call operator", '& "C:\\Program Files\\Git\\bin\\git.exe" commit --amend'],
    ["uppercase executable", "GIT.EXE commit --amend"],
    ["chained after &&", "npm test && git commit --amend"],
    ["chained after ;", "git add -A; git commit --amend"],
    ["chained via powershell pipeline", "git add -A | Out-Null; git commit --amend"],
    ["newline separated", "git add -A\ngit commit --amend"],
    ["posix subshell", "echo $(git commit --amend)"],
    ["bash -c wrapper", 'bash -c "git commit --amend"'],
    ["sh -c wrapper", "sh -c 'git commit --amend'"],
    ["powershell -Command wrapper", 'pwsh -Command "git commit --amend"'],
    ["cmd /c wrapper", 'cmd /c "git commit --amend"'],
  ];

  for (const [label, command] of spellings) {
    it(`recognises ${label} in both shells`, () => {
      expect(detectProtectedOperations(command)).toContain("git.commit.amend");
      expect(decide(bash(command)).action).toBe("block");
      expect(decide(pwsh(command)).action).toBe("block");
    });
  }

  it("recognises a base64 PowerShell -EncodedCommand payload", () => {
    const encoded = Buffer.from("git commit --amend", "utf16le").toString("base64");
    const command = `powershell -EncodedCommand ${encoded}`;
    expect(detectProtectedOperations(command)).toContain("git.commit.amend");
    expect(decide(pwsh(command)).action).toBe("block");
  });
});

describe("the rest of the protected set, in both shells", () => {
  const protectedCommands = [
    ["git.reset.hard", "git reset --hard HEAD~1"],
    ["git.push.force", "git push --force origin main"],
    ["git.push.force", "git push -f origin main"],
    ["git.push.force", "git push origin +main"],
    ["git.push.force", "git push --force --force-if-includes origin main"],
    ["git.clean.force", "git clean -fdx"],
    ["git.checkout.discard", "git checkout -- src/App.tsx"],
    ["git.checkout.discard", "git checkout ."],
    ["git.switch.discard", "git switch --discard-changes main"],
    ["git.rm.recursive", "git rm -r src"],
  ];

  for (const [operation, command] of protectedCommands) {
    it(`blocks ${command} identically in Bash and PowerShell`, () => {
      const fromBash = decide(bash(command));
      const fromPwsh = decide(pwsh(command));
      expect(fromBash.action).toBe("block");
      expect(fromPwsh.action).toBe("block");
      expect(fromBash.operations).toContain(operation);
      expect(fromPwsh.operations).toEqual(fromBash.operations);
    });
  }
});

describe("ordinary commands stay usable", () => {
  const safeCommands = [
    "git status",
    "git status --porcelain",
    "git log --oneline -20",
    "git diff --cached",
    "git show HEAD --stat",
    "git branch --show-current",
    "git add -A",
    "git commit -m 'feat: add the thing'",
    "git commit -am 'fix: correct the other thing'",
    "git push origin main",
    "git pull --rebase",
    "git fetch --all",
    "git stash",
    "git checkout -b feature/new-deck",
    "git switch main",
    "git rm src/old.ts",
    "git restore --staged src/App.tsx",
    "npm test",
    "npm run build",
    "bash scripts/deploy.sh",
    "bash scripts/deploy.sh --dry-run",
    "node -p \"require('./package.json').name\"",
    "ls -la",
  ];

  for (const command of safeCommands) {
    it(`allows ${command} in both shells`, () => {
      expect(detectProtectedOperations(command)).toEqual([]);
      expect(decide(bash(command)).action).toBe("allow");
      expect(decide(pwsh(command)).action).toBe("allow");
    });
  }

  it("does not fire on a commit message that merely mentions an amend", () => {
    const command = "git commit -m 'docs: explain when to use --amend'";
    expect(detectProtectedOperations(command)).toEqual([]);
    expect(decide(bash(command)).action).toBe("allow");
    expect(decide(pwsh(command)).action).toBe("allow");
  });

  it("treats --force-with-lease as the safety-checked force it is", () => {
    const command = "git push --force-with-lease origin main";
    expect(detectProtectedOperations(command)).toEqual([]);
    expect(decide(pwsh(command)).action).toBe("allow");
  });

  it("ignores non-shell tools entirely", () => {
    const payload = { tool_name: "Read", tool_input: { file_path: "git commit --amend" } };
    expect(decide(payload).action).toBe("allow");
  });

  it("ignores an empty or missing command", () => {
    expect(decide(bash("")).action).toBe("allow");
    expect(decide({ tool_name: "PowerShell", tool_input: {} }).action).toBe("allow");
  });
});

describe("the gate message", () => {
  it("names the tool it blocked and the operation it recognised", () => {
    const { message } = decide(pwsh("git commit --amend"));
    expect(message).toContain("PowerShell");
    expect(message).toContain("rewrites the last commit");
    expect(message).toContain("keyed to the operation, not to the shell");
  });
});
