const { spawn } = require("node:child_process");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : npmCommand;
const commandArgs = (script) =>
  process.platform === "win32"
    ? ["/d", "/s", "/c", `npm run ${script}`]
    : ["run", script];

const children = [
  spawn(command, commandArgs("server"), {
    stdio: "inherit",
    env: process.env,
  }),
  spawn(command, commandArgs("start:expo"), {
    stdio: "inherit",
    env: process.env,
  }),
];

let stopping = false;

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.pid) continue;

    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } else {
      child.kill("SIGTERM");
    }
  }

  process.exit(exitCode);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code && code !== 0) stopAll(code);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
