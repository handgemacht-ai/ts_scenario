import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "cjs", "package.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
