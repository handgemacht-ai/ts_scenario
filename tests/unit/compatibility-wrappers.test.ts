import { describe, expect, it } from "vitest";

import {
  createRegistry,
  defineCatalog,
  definePrototypes,
  defineScenario,
  ref,
} from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog, organizations, users, posts } from "../fixtures/prototypes.js";

// --- prototype() wrapper ---

describe("prototype() wrapper", () => {
  it("allows definePrototypes values to be wrapped with prototype()", async () => {
    // Import the new prototype() wrapper
    const { prototype } = await import("../../src/index.js");

    const orgs = definePrototypes("organizations", {
      acme: prototype({
        name: "Acme",
        slug: "acme",
      }),
    });

    expect(orgs.acme.ref).toEqual({
      $kind: "prototype-ref",
      resource: "organizations",
      prototype: "acme",
    });
    expect(orgs.acme.input).toMatchObject({ name: "Acme", slug: "acme" });
  });

  it("supports metadata options in prototype() wrapper", async () => {
    const { prototype } = await import("../../src/index.js");

    const orgs = definePrototypes("organizations", {
      acme: prototype(
        { name: "Acme", slug: "acme" },
        {
          actor: ref("users", "adminUser"),
          authorize: true,
          action: "create",
        },
      ),
    });

    // The handle should still expose standard properties
    expect(orgs.acme.name).toBe("acme");
    expect(orgs.acme.resource).toBe("organizations");
  });
});

// --- override() wrapper ---

describe("override() wrapper", () => {
  it("allows scenario override entries to use override() wrapper", async () => {
    const { override } = await import("../../src/index.js");

    const scenario = defineScenario(catalog, {
      name: "withOverride",
      prototypes: {
        organizations: {
          acme: override(
            { slug: "overridden-acme" },
            { authorize: false },
          ),
        },
      },
    });

    expect(scenario.prototypes.organizations?.acme).toBeDefined();
  });
});

// --- entry() wrapper ---

describe("entry() wrapper", () => {
  it("allows registry.run() to accept entry() wrapped targets", async () => {
    const { entry } = await import("../../src/index.js");

    const registry = createRegistry(catalog);

    const result = await registry.run([
      entry(catalog.organizations.acme, { slug: "entry-acme" }),
    ]);

    const org = result.byName("acme");
    expect(org.slug).toBe("entry-acme");
  });

  it("entry() supports metadata options", async () => {
    const { entry } = await import("../../src/index.js");

    const registry = createRegistry(catalog);

    const result = await registry.run([
      entry(
        catalog.organizations.acme,
        { slug: "entry-meta" },
        { action: "seed", authorize: false },
      ),
    ]);

    expect(result.byName("acme")).toBeDefined();
  });
});
