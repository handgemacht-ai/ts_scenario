import { describe, expect, it } from "vitest";

// testing helpers do not exist yet — these imports will fail until implemented
// Expected API surface from src/public/testing.ts:
//   testing.createMemoryRegistry(catalog) → Registry
//   testing.runOrThrow(registry, entries, options?) → Promise<RunResult>
//   testing.assertCreated(results, target) → void
//   testing.assertAttr(results, target, attr, expected) → void
//   testing.assertAttrNotEmpty(results, target, attr) → void

import "../fixtures/schema.js";
import { catalog } from "../fixtures/prototypes.js";

describe("testing.createMemoryRegistry(catalog)", () => {
  it("returns a Registry with deterministic create behavior and fresh sequence state", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);

    // Should be able to run prototypes and get deterministic results
    const result = await registry.run([catalog.organizations.acme]);
    const org = result.byName("acme");
    expect(org).toBeDefined();
    expect(org!.name).toBe("Acme");
    expect(org!.slug).toBe("acme");
  });
});

describe("testing.runOrThrow(registry, entries, options?)", () => {
  it("runs entries and returns RunResult on success", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await testing.runOrThrow(registry, [catalog.organizations.acme]);

    const org = result.byName("acme");
    expect(org).toBeDefined();
    expect(org!.name).toBe("Acme");
  });

  it("throws on failure, preserving original error as cause", async () => {
    const { testing } = await import("../../src/public/testing.js");
    const { createRegistry } = await import("../../src/public/index.js");

    // Create a registry with a create handler that throws
    const registry = createRegistry(catalog, {
      create: {
        organizations: () => { throw new Error("db-connection-failed"); },
      },
    });

    try {
      await testing.runOrThrow(registry, [catalog.organizations.acme]);
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(Error);
      const error = err as Error;
      expect(error.cause).toBeInstanceOf(Error);
      expect((error.cause as Error).message).toMatch(/db-connection-failed/);
    }
  });
});

describe("testing.assertCreated(results, target)", () => {
  it("passes when target exists in results", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    // Should not throw
    expect(() => testing.assertCreated(result, catalog.organizations.acme)).not.toThrow();
  });

  it("throws when target is absent", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    // beta was never run — should throw
    expect(() => testing.assertCreated(result, catalog.organizations.beta)).toThrow();
  });
});

describe("testing.assertAttr(results, target, attr, expected)", () => {
  it("passes when attr matches expected value", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    expect(() => testing.assertAttr(result, catalog.organizations.acme, "name", "Acme")).not.toThrow();
  });

  it("throws when attr does not match", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    expect(() => testing.assertAttr(result, catalog.organizations.acme, "name", "Wrong")).toThrow();
  });

  it("throws when target not in results", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    expect(() => testing.assertAttr(result, catalog.organizations.beta, "name", "Beta")).toThrow();
  });
});

describe("testing.assertAttrNotEmpty(results, target, attr)", () => {
  it("passes for non-empty values", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    expect(() => testing.assertAttrNotEmpty(result, catalog.organizations.acme, "name")).not.toThrow();
  });

  it("throws for undefined", async () => {
    const { testing } = await import("../../src/public/testing.js");

    const registry = testing.createMemoryRegistry(catalog);
    const result = await registry.run([catalog.organizations.acme]);

    // "nonexistent_field" is not in the record → resolves to undefined
    expect(() => testing.assertAttrNotEmpty(result, catalog.organizations.acme, "nonexistent_field")).toThrow();
  });

  it("throws for null", async () => {
    const { testing } = await import("../../src/public/testing.js");
    const { createRegistry } = await import("../../src/public/index.js");

    // Create a registry that returns a record with a null field
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ attrs }) => ({ id: "org-1", ...attrs, description: null }),
      },
    });

    const result = await registry.run([catalog.organizations.acme]);
    expect(() => testing.assertAttrNotEmpty(result, catalog.organizations.acme, "description")).toThrow();
  });

  it("throws for empty string", async () => {
    const { testing } = await import("../../src/public/testing.js");
    const { createRegistry } = await import("../../src/public/index.js");

    // Create a registry that returns a record with an empty-string field
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ attrs }) => ({ id: "org-1", ...attrs, description: "" }),
      },
    });

    const result = await registry.run([catalog.organizations.acme]);
    expect(() => testing.assertAttrNotEmpty(result, catalog.organizations.acme, "description")).toThrow();
  });
});
