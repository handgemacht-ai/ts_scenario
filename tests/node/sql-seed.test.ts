import { describe, expect, it, vi } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// sqlFile does not exist yet — import will fail until implemented
// Expected API from src/runtime/node.ts:
//   sqlFile(path, executeStatement) → Promise<void>

describe("sqlFile(path, executeStatement)", () => {
  let tempDir: string;

  async function writeTempSql(content: string): Promise<string> {
    tempDir = await mkdtemp(join(tmpdir(), "sql-seed-"));
    const filePath = join(tempDir, "seed.sql");
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  it("reads file, splits on semicolons, and executes each statement", async () => {
    const { sqlFile } = await import("../../src/runtime/node.js");

    const path = await writeTempSql("CREATE TABLE a (id INT); INSERT INTO a VALUES (1);");
    const executed: string[] = [];

    await sqlFile(path, async (sql) => { executed.push(sql); });

    expect(executed).toEqual([
      "CREATE TABLE a (id INT)",
      "INSERT INTO a VALUES (1)",
    ]);

    await rm(tempDir, { recursive: true });
  });

  it("skips empty statements after split", async () => {
    const { sqlFile } = await import("../../src/runtime/node.js");

    // Trailing semicolon and double semicolons produce empty segments
    const path = await writeTempSql("SELECT 1;; SELECT 2;");
    const executed: string[] = [];

    await sqlFile(path, async (sql) => { executed.push(sql); });

    expect(executed).toEqual(["SELECT 1", "SELECT 2"]);

    await rm(tempDir, { recursive: true });
  });

  it("trims whitespace around statements before execution", async () => {
    const { sqlFile } = await import("../../src/runtime/node.js");

    const path = await writeTempSql("  SELECT 1  ;\n  SELECT 2  ;");
    const executed: string[] = [];

    await sqlFile(path, async (sql) => { executed.push(sql); });

    expect(executed).toEqual(["SELECT 1", "SELECT 2"]);

    await rm(tempDir, { recursive: true });
  });

  it("executes statements sequentially in order", async () => {
    const { sqlFile } = await import("../../src/runtime/node.js");

    const path = await writeTempSql("A; B; C;");
    const order: string[] = [];

    await sqlFile(path, async (sql) => {
      // Simulate async work to prove sequential execution
      await new Promise((r) => setTimeout(r, 5));
      order.push(sql);
    });

    expect(order).toEqual(["A", "B", "C"]);

    await rm(tempDir, { recursive: true });
  });

  it("propagates executor errors", async () => {
    const { sqlFile } = await import("../../src/runtime/node.js");

    const path = await writeTempSql("GOOD; BAD; NEVER;");
    const executed: string[] = [];

    await expect(
      sqlFile(path, async (sql) => {
        executed.push(sql);
        if (sql === "BAD") throw new Error("execution-failed");
      }),
    ).rejects.toThrow("execution-failed");

    // "NEVER" should not have been reached
    expect(executed).toEqual(["GOOD", "BAD"]);

    await rm(tempDir, { recursive: true });
  });

  it("calls executor zero times for empty file", async () => {
    const { sqlFile } = await import("../../src/runtime/node.js");

    const path = await writeTempSql("");
    const executor = vi.fn();

    await sqlFile(path, executor);

    expect(executor).not.toHaveBeenCalled();

    await rm(tempDir, { recursive: true });
  });
});
