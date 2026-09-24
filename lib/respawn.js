import { spawn } from "node:child_process";

export default function respawn(argv) {
  const [bin, ...args] = argv;
  const child = spawn(bin, args, { stdio: "inherit" });
  child.on("exit", function (code, signal) {
    process.on("exit", function () {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code);
      }
    });
  });
  return child;
}
