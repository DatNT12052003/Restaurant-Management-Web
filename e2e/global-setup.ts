import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const BACKEND_DIR = process.env.BACKEND_DIR ?? path.resolve(HERE, "../../Restaurant-Management-BackEnd");
export const FIXTURE_FILE = path.join(HERE, ".fixture.json");

/** Seed DB test qua script của backend, lưu username theo vai trò cho các test đọc */
export default function globalSetup() {
    const result = spawnSync("npx", ["tsx", "tests/e2e-seed.ts"], { cwd: BACKEND_DIR, encoding: "utf8", shell: true });
    const line = result.stdout.split("\n").find((l) => l.startsWith("E2E_FIXTURE="));
    if (result.status !== 0 || !line) {
        throw new Error(`E2E seed failed:\n${result.stdout}\n${result.stderr}`);
    }
    fs.writeFileSync(FIXTURE_FILE, line.slice("E2E_FIXTURE=".length));
}
