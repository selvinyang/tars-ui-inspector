import { spawn } from "node:child_process";
import process from "node:process";

const executable = process.platform === "win32" ? "vinext.cmd" : "vinext";
const collector = spawn(process.execPath, ["scripts/collector-server.mjs"], { stdio: "inherit" });
const app = spawn(executable, ["dev"], { stdio: "inherit", env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" } });
const stop = signal => { collector.kill(signal); app.kill(signal); };
process.on("SIGINT", () => stop("SIGINT")); process.on("SIGTERM", () => stop("SIGTERM"));
app.on("exit", code => { collector.kill("SIGTERM"); process.exit(code ?? 0); });
collector.on("exit", code => { if (code && !app.killed) { app.kill("SIGTERM"); process.exit(code); } });
