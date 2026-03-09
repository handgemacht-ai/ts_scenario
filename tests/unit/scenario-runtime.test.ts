import { describe, expect, it } from "vitest";

import {
  createRegistry,
  defineScenario,
  materializeScenario,
  ref,
} from "../../src/index.js";
import type { CreateContext } from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog, organizations, users, posts } from "../fixtures/prototypes.js";

// --- Actor ref resolution ---

describe("actor ref resolution", () => {
  it("resolves actor ref and passes it to CreateContext", async () => {
    const { override } = await import("../../src/index.js");

    let capturedCtx: CreateContext | undefined;
    const registry = createRegistry(catalog, {
      create: {
        users: (ctx) => {
          capturedCtx = ctx;
          return { id: "user:1", ...ctx.attrs };
        },
      },
    });

    // Set actor on user (which depends on org). Org is created first,
    // so it's available as actor when the user is created.
    const scenario = defineScenario(catalog, {
      name: "withActor",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { actor: ref("organizations", "acme") }),
        },
      },
    });

    await registry.runScenario(scenario);

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.actor).toBeDefined();
    expect(capturedCtx!.actor).toMatchObject({ name: "Acme", slug: "acme" });
  });

  it("actor ref is auto-included in dependency graph", async () => {
    const { override } = await import("../../src/index.js");

    const calls: string[] = [];
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ prototype, attrs }) => {
          calls.push(`org:${prototype}`);
          return { id: `org:${prototype}`, ...attrs };
        },
        users: ({ prototype, attrs }) => {
          calls.push(`user:${prototype}`);
          return { id: `user:${prototype}`, ...attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "actorDep",
      prototypes: {
        organizations: {
          acme: override({}, { actor: ref("users", "adminUser") }),
        },
        // adminUser not explicitly listed — should be auto-included
      },
    });

    await registry.runScenario(scenario);

    // adminUser's org dep and adminUser should be created before org:acme
    expect(calls).toContain("user:adminUser");
  });

  it("same actor ref is not created twice if already in the graph", async () => {
    const { override } = await import("../../src/index.js");

    const calls: string[] = [];
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ prototype, attrs }) => {
          calls.push(`org:${prototype}`);
          return { id: `org:${prototype}`, ...attrs };
        },
        users: ({ prototype, attrs }) => {
          calls.push(`user:${prototype}`);
          return { id: `user:${prototype}`, ...attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "actorDedup",
      prototypes: {
        organizations: {
          acme: override({}, { actor: ref("users", "adminUser") }),
        },
        users: {
          adminUser: {},  // explicitly listed AND used as actor
        },
      },
    });

    await registry.runScenario(scenario);

    const userCalls = calls.filter((c) => c === "user:adminUser");
    expect(userCalls).toHaveLength(1);
  });
});

// --- Authorize defaults ---

describe("authorize defaults", () => {
  it("authorize defaults to true when actor resolves", async () => {
    const { override } = await import("../../src/index.js");

    let capturedCtx: CreateContext | undefined;
    const registry = createRegistry(catalog, {
      create: {
        users: (ctx) => {
          capturedCtx = ctx;
          return { id: "user:1", ...ctx.attrs };
        },
      },
    });

    // Actor is org (created before user), so it's available at user creation time
    const scenario = defineScenario(catalog, {
      name: "authzDefault",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { actor: ref("organizations", "acme") }),
        },
      },
    });

    await registry.runScenario(scenario);
    expect(capturedCtx!.authorize).toBe(true);
  });

  it("authorize defaults to false when no actor resolves", async () => {
    let capturedCtx: CreateContext | undefined;
    const registry = createRegistry(catalog, {
      create: {
        organizations: (ctx) => {
          capturedCtx = ctx;
          return { id: "org:1", ...ctx.attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "noAuthz",
      prototypes: {
        organizations: { acme: {} },
      },
    });

    await registry.runScenario(scenario);
    expect(capturedCtx!.authorize).toBe(false);
  });

  it("explicit authorize overrides the default", async () => {
    const { override } = await import("../../src/index.js");

    let capturedCtx: CreateContext | undefined;
    const registry = createRegistry(catalog, {
      create: {
        users: (ctx) => {
          capturedCtx = ctx;
          return { id: "user:1", ...ctx.attrs };
        },
      },
    });

    // Actor is org (created first), explicit authorize: false overrides the default true
    const scenario = defineScenario(catalog, {
      name: "explicitAuthz",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { actor: ref("organizations", "acme"), authorize: false }),
        },
      },
    });

    await registry.runScenario(scenario);
    expect(capturedCtx!.authorize).toBe(false);
  });
});

// --- Tenant extraction ---

describe("tenant extraction", () => {
  it("tenantFrom extracts resolved attr value into CreateContext.tenant in persisted mode", async () => {
    const { override } = await import("../../src/index.js");

    let capturedCtx: CreateContext | undefined;
    const registry = createRegistry(catalog, {
      create: {
        users: (ctx) => {
          capturedCtx = ctx;
          return { id: "user:1", ...ctx.attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "withTenant",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { tenantFrom: "organization_id" }),
        },
      },
    });

    const result = await registry.runScenario(scenario);

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.tenant).toBeDefined();
    // tenant should be the resolved organization_id value
    expect(typeof capturedCtx!.tenant).toBe("string");
  });

  it("tenantFrom removes source attr from attrs in persisted mode", async () => {
    const { override } = await import("../../src/index.js");

    let capturedAttrs: Record<string, unknown> | undefined;
    const registry = createRegistry(catalog, {
      create: {
        users: (ctx) => {
          capturedAttrs = ctx.attrs;
          return { id: "user:1", ...ctx.attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "tenantRemove",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { tenantFrom: "organization_id" }),
        },
      },
    });

    await registry.runScenario(scenario, { mode: "persisted" });

    expect(capturedAttrs).toBeDefined();
    expect(capturedAttrs!.organization_id).toBeUndefined();
  });

  it("tenantFrom keeps attr on object in struct mode", async () => {
    const { override } = await import("../../src/index.js");

    let capturedCtx: CreateContext | undefined;
    const registry = createRegistry(catalog, {
      create: {
        users: (ctx) => {
          capturedCtx = ctx;
          return { id: "user:1", ...ctx.attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "tenantStruct",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { tenantFrom: "organization_id" }),
        },
      },
    });

    await registry.runScenario(scenario, { mode: "struct" });

    expect(capturedCtx!.tenant).toBeDefined();
    // In struct mode, the attr should still be present
    expect(capturedCtx!.attrs.organization_id).toBeDefined();
  });
});

// --- Scenario inheritance cycle detection ---

describe("scenario inheritance cycle detection", () => {
  it("detects direct cycle and throws typed error", () => {
    // Create scenarios that form a cycle: A extends B, B extends A
    const scenarioA: any = defineScenario(catalog, {
      name: "scenarioA",
      prototypes: { organizations: { acme: {} } },
    });

    const scenarioB = defineScenario(catalog, {
      name: "scenarioB",
      extends: scenarioA,
      prototypes: {},
    });

    // Mutate to create cycle (normally immutable, but for test)
    (scenarioA as any).extends = [scenarioB];

    const registry = createRegistry(catalog);

    expect(
      registry.runScenario(scenarioA),
    ).rejects.toThrow(/cycle|circular/i);
  });

  it("reports the full participating path in the error", () => {
    const scenarioA: any = defineScenario(catalog, {
      name: "scenarioA",
      prototypes: {},
    });

    const scenarioB = defineScenario(catalog, {
      name: "scenarioB",
      extends: scenarioA,
      prototypes: {},
    });

    (scenarioA as any).extends = [scenarioB];

    const registry = createRegistry(catalog);

    expect(
      registry.runScenario(scenarioA),
    ).rejects.toThrow(/scenarioA.*scenarioB|scenarioB.*scenarioA/);
  });
});

// --- Multi-parent merge semantics ---

describe("multi-parent merge semantics", () => {
  it("parents merge left-to-right, child wins over all parents", () => {
    const parent1 = defineScenario(catalog, {
      name: "parent1",
      prototypes: {
        organizations: {
          acme: { name: "Parent1-Acme", slug: "p1" },
        },
      },
    });

    const parent2 = defineScenario(catalog, {
      name: "parent2",
      prototypes: {
        organizations: {
          acme: { name: "Parent2-Acme", slug: "p2" },
        },
      },
    });

    const child = defineScenario(catalog, {
      name: "child",
      extends: [parent1, parent2],
      prototypes: {
        organizations: {
          acme: { slug: "child-slug" },
        },
      },
    });

    const materialized = materializeScenario(child);

    // parent2 name should win over parent1 (left-to-right merge)
    expect(materialized.prototypes.organizations?.acme).toMatchObject({
      name: "Parent2-Acme",
      slug: "child-slug",  // child wins for slug
    });
  });

  it("null clears an inherited attr", async () => {
    const parent = defineScenario(catalog, {
      name: "parentWithSlug",
      prototypes: {
        organizations: {
          acme: { slug: "parent-slug" },
        },
      },
    });

    const child = defineScenario(catalog, {
      name: "childClears",
      extends: parent,
      prototypes: {
        organizations: {
          acme: { slug: null as any },
        },
      },
    });

    const { materializeScenario } = await import("../../src/index.js");
    const materialized = materializeScenario(child);

    // null should explicitly clear the attr
    expect((materialized.prototypes.organizations?.acme as any)?.slug).toBeNull();
  });
});
