// Stable entry point; Playwright implementation lives in scripts/catalog/scraper.ts.
// Original supplied script retained in docs/catalog/evidence for audit.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const child = spawn(process.execPath, ["--import", "tsx", path.join(__dirname, "catalog/sync-cli.ts"), ...process.argv.slice(2)], { cwd: path.join(__dirname, ".."), stdio: "inherit" });
child.on("error", () => { console.error("Impossible de démarrer la synchronisation."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
