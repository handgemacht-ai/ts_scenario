import { describe, expect, it } from "vitest";

import {
  createRegistry,
  defineScenario,
  UnknownResourceError,
} from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog, organizations } from "../fixtures/prototypes.js";

describe("registry.runAll(resource)", () => {
  it("creates every registered prototype for a resource", async () => {
    const registry = createRegistry(catalog);

    // runAll should create all prototypes under "organizations" (acme + beta)
    const result = await registry.runAll("organizations");

    const acme = result.byName("acme");
    const beta = result.byName("beta");

    expect(acme).toMatchObject({ name: "Acme", slug: "acme" });
    expect(beta).toMatchObject({ name: "Beta", slug: "beta" });
  });

  it("creates prototypes in deterministic order", async () => {
    const calls: string[] = [];
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ prototype, attrs }) => {
          calls.push(prototype);
          return { id: `org:${prototype}`, ...attrs };
        },
      },
    });

    await registry.runAll("organizations");

    // Order must be deterministic (alphabetical by prototype name)
    expect(calls).toEqual(["acme", "beta"]);
  });

  it("throws UnknownResourceError for nonexistent resource", async () => {
    const registry = createRegistry(catalog);

    await expect(
      // @ts-expect-error — intentionally passing invalid resource
      registry.runAll("widgets"),
    ).rejects.toThrow(UnknownResourceError);
  });

  it("includes transitive dependencies when running all prototypes", async () => {
    const registry = createRegistry(catalog);

    // Running all users should auto-create their org dependencies
    const result = await registry.runAll("users");

    // Both viewerUser and adminUser depend on organizations:acme
    const acme = result.byName("acme");
    expect(acme).toBeDefined();
    expect(acme).toMatchObject({ name: "Acme" });
  });
});
