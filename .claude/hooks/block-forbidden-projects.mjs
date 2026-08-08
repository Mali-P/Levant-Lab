// Hard block on the sibling projects in C:\Projects.
//
// Work in the Levantry checkout must never reach Pesto-Publishing,
// Pesto-Publishing-cmyk, Pesto-Publishing-e43, pesto-tts or
// pesto-vault-recovery. This runs before every file and shell tool call and
// exits 2 to refuse the call outright, so the rule holds even if the model
// has forgotten it.
//
// Scope: file tools are judged on their target path only, and shell tools on
// the command text. Writing the word in a document is fine; touching the
// directories is not.

const FORBIDDEN = /pesto/i;

const FILE_TOOLS = new Set(["Write", "Edit", "Read", "NotebookEdit", "MultiEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

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
  const input = payload.tool_input ?? {};

  let offender = null;

  if (FILE_TOOLS.has(tool)) {
    for (const key of ["file_path", "notebook_path", "path"]) {
      const value = input[key];
      if (typeof value === "string" && FORBIDDEN.test(value)) offender = value;
    }
  } else if (SHELL_TOOLS.has(tool)) {
    const command = input.command;
    if (typeof command === "string" && FORBIDDEN.test(command)) offender = command;
  }

  if (offender === null) process.exit(0);

  process.stderr.write(
    `BLOCKED: this ${tool} call references a forbidden project.\n\n` +
      `  ${offender.slice(0, 200)}\n\n` +
      `The Levantry project may never read, write, build or deploy anything ` +
      `under the forbidden directories in C:\\Projects. Do not retry this ` +
      `call with a workaround; tell the user it was blocked.\n`
  );
  process.exit(2);
});
