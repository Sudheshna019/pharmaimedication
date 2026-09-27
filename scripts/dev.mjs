// Starts both servers for local development / demo:
//   1. Python ML service  (FastAPI, port 8000)
//   2. Node web server    (Express + Vite frontend + OCR, port 3000)
// Usage: npm run dev
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const venvPython = process.platform === "win32"
  ? path.join(root, "backend", ".venv", "Scripts", "python.exe")
  : path.join(root, "backend", ".venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : (process.platform === "win32" ? "python" : "python3");

const procs = [];
// On Windows, kill the whole process tree (npx/tsx start child processes)
const stop = (p) => process.platform === "win32"
  ? spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" })
  : p.kill();
function run(name, cmd, args, color) {
  const p = spawn(cmd, args, { cwd: root, shell: process.platform === "win32" && cmd === "npx", env: process.env });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => stream.on("data", (d) =>
    d.toString().split(/\r?\n/).filter(Boolean).forEach((line) => out.write(prefix + line + "\n")));
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on("exit", (code) => {
    console.log(`${prefix}exited with code ${code}`);
    procs.forEach((q) => q !== p && stop(q));
    process.exit(code ?? 0);
  });
  procs.push(p);
}

console.log(`Starting PharmAI (Python: ${python})`);
run("ml ", python, ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"], "35");
run("web", "npx", ["tsx", "server.ts"], "36");
process.on("SIGINT", () => { procs.forEach(stop); process.exit(0); });
