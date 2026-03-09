import { describe, expect, it } from "vitest";

// seed helpers do not exist yet — these imports will fail until implemented
// Expected API surface from src/public/seed.ts:
//   seed.func(name, fn) → Seeder
//   seed.chain(...seeders) → Seeder

describe("seed.func(name, fn)", () => {
  it("wraps a function as a Seeder with name and seed()", async () => {
    const { seed } = await import("../../src/public/seed.js");

    let called = false;
    const seeder = seed.func("my-seeder", async () => {
      called = true;
    });

    expect(seeder.name).toBe("my-seeder");
    await seeder.seed();
    expect(called).toBe(true);
  });

  it("seed() calls the wrapped fn with ctx", async () => {
    const { seed } = await import("../../src/public/seed.js");

    let receivedCtx: Record<string, unknown> | undefined;
    const seeder = seed.func("ctx-seeder", async (ctx) => {
      receivedCtx = ctx.runCtx;
    });

    await seeder.seed({ runCtx: { tenant: "acme" } });
    expect(receivedCtx).toEqual({ tenant: "acme" });
  });

  it("seed() supports async functions", async () => {
    const { seed } = await import("../../src/public/seed.js");

    const order: number[] = [];
    const seeder = seed.func("async-seeder", async () => {
      await new Promise((r) => setTimeout(r, 5));
      order.push(1);
    });

    await seeder.seed();
    expect(order).toEqual([1]);
  });
});

describe("seed.chain(...seeders)", () => {
  it("runs seeders sequentially in order", async () => {
    const { seed } = await import("../../src/public/seed.js");

    const order: string[] = [];
    const a = seed.func("a", async () => { order.push("a"); });
    const b = seed.func("b", async () => { order.push("b"); });
    const c = seed.func("c", async () => { order.push("c"); });

    const chained = seed.chain(a, b, c);
    await chained.seed();

    expect(order).toEqual(["a", "b", "c"]);
  });

  it("stops on first failure and does not call subsequent seeders", async () => {
    const { seed } = await import("../../src/public/seed.js");

    const order: string[] = [];
    const a = seed.func("a", async () => { order.push("a"); });
    const b = seed.func("b", async () => { throw new Error("b-failed"); });
    const c = seed.func("c", async () => { order.push("c"); });

    const chained = seed.chain(a, b, c);
    await expect(chained.seed()).rejects.toThrow("b-failed");
    expect(order).toEqual(["a"]);
  });

  it("empty chain resolves without error", async () => {
    const { seed } = await import("../../src/public/seed.js");

    const chained = seed.chain();
    await expect(chained.seed()).resolves.toBeUndefined();
  });

  it("derived name is chain(a,b,...)", async () => {
    const { seed } = await import("../../src/public/seed.js");

    const a = seed.func("alpha", async () => {});
    const b = seed.func("beta", async () => {});

    const chained = seed.chain(a, b);
    expect(chained.name).toBe("chain(alpha,beta)");
  });
});
