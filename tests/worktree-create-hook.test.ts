import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));

function run(command: string, args: string[], options?: { cwd?: string; input?: string }) {
  return spawnSync(command, args, {
    cwd: options?.cwd,
    input: options?.input,
    encoding: "utf8",
  });
}

function resolveRepoRoot(): string | undefined {
  const result = run("git", ["-C", testDir, "rev-parse", "--show-toplevel"]);
  if (result.status !== 0) return undefined;
  return result.stdout.trim();
}

function commandExists(command: string): boolean {
  return run("bash", ["-lc", `command -v ${command}`]).status === 0;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

describe("worktree-create hook", () => {
  it("provisions a worktree without tracked changes", { timeout: 120_000 }, (ctx) => {
    const repoRoot = resolveRepoRoot();
    const hookPath = repoRoot ? join(repoRoot, ".pi", "scripts", "worktree-create.sh") : undefined;
    const toolsAvailable = ["git", "jq", "bash"].every(commandExists);

    if (!repoRoot || !hookPath || !existsSync(hookPath) || !toolsAvailable) {
      ctx.skip();
      return;
    }

    // Unique throwaway name so parallel/repeat runs never collide.
    const testName = "TestWorktreeCreateHook-ProvisionsWorktreeWithoutTrackedChanges";
    const now = new Date();
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}-${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}-${pad(Number(process.hrtime.bigint() % 1_000_000_000n), 9)}`;
    const name = `${testName}-${stamp}`;
    const worktreeDir = join(repoRoot, ".claude", "worktrees", name);
    const branch = `claude/${name}`;

    try {
      // WHEN the harness invokes the hook: {"name","cwd"} JSON on stdin, last
      // non-empty stdout line must be the new worktree's absolute path.
      const result = run("bash", [hookPath], {
        cwd: repoRoot,
        input: JSON.stringify({ name, cwd: repoRoot }),
      });

      // Regression: before the fix, the tracked-changes guard exited 1 on
      // every creation because the per-worktree .worktree.env rewrite touched
      // a file that was tracked at HEAD.
      expect(result.status, `hook exited non-zero\nstdout: ${result.stdout}\nstderr: ${result.stderr}`).toBe(0);

      const stdoutLines = result.stdout.replace(/\n+$/, "").split("\n");
      let lastLine = "";
      for (let i = stdoutLines.length - 1; i >= 0; i--) {
        const trimmed = stdoutLines[i].trim();
        if (trimmed !== "") {
          lastLine = trimmed;
          break;
        }
      }
      expect(lastLine, `hook produced no non-empty stdout line\nstderr: ${result.stderr}`).not.toBe("");
      expect(lastLine, "last stdout line must be the worktree dir").toBe(worktreeDir);
      expect(statSync(lastLine).isDirectory(), `last stdout line is not an existing directory: ${lastLine}`).toBe(true);

      // AND the new worktree contains a non-empty .worktree.env with WORKTREE_INDEX.
      const envContent = readFileSync(join(lastLine, ".worktree.env"), "utf8");
      expect(envContent.trim(), "new worktree .worktree.env is empty").not.toBe("");
      expect(envContent, `.worktree.env missing WORKTREE_INDEX= line:\n${envContent}`).toContain("WORKTREE_INDEX=");

      // AND the new worktree has no tracked modifications — the assertion
      // that failed before the fix (hook rewrote tracked .worktree.env → exit 1).
      const status = run("git", ["-C", lastLine, "status", "--porcelain"]);
      expect(status.status, `git status failed in new worktree: ${status.stderr}`).toBe(0);
      const modified = status.stdout
        .replace(/\n+$/, "")
        .split("\n")
        .filter((line) => line !== "" && !line.startsWith("??"));
      expect(modified, "new worktree has tracked modifications (the regression the hook's guard must prevent)").toEqual([]);
    } finally {
      // Cleanup in ALL cases — the hook may fail partway through provisioning.
      for (const args of [
        ["worktree", "remove", "--force", worktreeDir],
        ["branch", "-D", branch],
        ["worktree", "prune"],
      ] as const) {
        run("git", ["-C", repoRoot, ...args]); // best-effort: throwaway artifacts only
      }
    }
  });
});
