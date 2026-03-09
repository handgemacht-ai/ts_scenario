import { describe, expect, it } from "vitest";
import {
  createRegistry,
  defineCatalog,
  definePrototypes,
  defineScenario,
  materializeScenario,
  ref,
  depField,
  dynamic,
  override,
  prototype,
  entry,
  fixturegen,
  Fixture,
  DependencyCycleError,
  ScenarioInheritanceCycleError,
} from "../../src/index.js";
import type { CreateContext } from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog, organizations, users, posts } from "../fixtures/prototypes.js";

// --- Chain: A → B → C ---

describe("chains (A depends on B depends on C)", () => {
  it("resolves a three-level dependency chain in correct order", async () => {
    const order: string[] = [];
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ prototype: p, attrs }) => {
          order.push(`org:${p}`);
          return { id: `org:${p}`, ...attrs };
        },
        users: ({ prototype: p, attrs }) => {
          order.push(`user:${p}`);
          return { id: `user:${p}`, ...attrs };
        },
        posts: ({ prototype: p, attrs }) => {
          order.push(`post:${p}`);
          return { id: `post:${p}`, ...attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "chain",
      prototypes: {
        organizations: { acme: {} },
        users: { viewerUser: {} },
        posts: { draftPost: {} },
      },
    });

    await registry.runScenario(scenario);

    // org must be created before user, user before post
    expect(order.indexOf("org:acme")).toBeLessThan(order.indexOf("user:viewerUser"));
    expect(order.indexOf("user:viewerUser")).toBeLessThan(order.indexOf("post:draftPost"));
  });
});

// --- Diamond: post depends on user and org, user depends on org ---

describe("diamonds (shared dependency resolved once)", () => {
  it("creates shared dependency only once in a diamond graph", async () => {
    const calls: string[] = [];
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ prototype: p, attrs }) => {
          calls.push(`org:${p}`);
          return { id: `org:${p}`, ...attrs };
        },
        users: ({ prototype: p, attrs }) => {
          calls.push(`user:${p}`);
          return { id: `user:${p}`, ...attrs };
        },
        posts: ({ prototype: p, attrs }) => {
          calls.push(`post:${p}`);
          return { id: `post:${p}`, ...attrs };
        },
      },
    });

    const scenario = defineScenario(catalog, {
      name: "diamond",
      prototypes: {
        organizations: { acme: {} },
        users: { viewerUser: {} },
        posts: { draftPost: {} },
      },
    });

    await registry.runScenario(scenario);

    // acme org should only be created once even though both user and post depend on it
    const orgCalls = calls.filter((c) => c === "org:acme");
    expect(orgCalls).toHaveLength(1);
  });
});

// --- Cycle errors ---

describe("cycle errors", () => {
  it("throws DependencyCycleError for circular refs", async () => {
    // Create resources that form a cycle using module augmentation trick:
    // We'll use the existing prototypes but inject a circular ref via override
    const cycleOrgs = definePrototypes("organizations", {
      cycleA: {
        name: "CycleA",
        slug: ref("organizations", "cycleB") as unknown as string,
      },
      cycleB: {
        name: "CycleB",
        slug: ref("organizations", "cycleA") as unknown as string,
      },
    });

    const cycleCatalog = defineCatalog({ organizations: cycleOrgs });
    const registry = createRegistry(cycleCatalog);

    const scenario = defineScenario(cycleCatalog, {
      name: "cycle",
      prototypes: {
        organizations: { cycleA: {}, cycleB: {} },
      },
    });

    await expect(registry.runScenario(scenario)).rejects.toThrow(DependencyCycleError);
  });
});

// --- Scenario inheritance ---

describe("scenario inheritance", () => {
  it("child scenario inherits and overrides parent prototypes", async () => {
    const parent = defineScenario(catalog, {
      name: "parent",
      prototypes: {
        organizations: { acme: {} },
        users: { viewerUser: {} },
      },
    });

    const child = defineScenario(catalog, {
      name: "child",
      extends: parent,
      prototypes: {
        users: { viewerUser: { name: "Overridden" } },
      },
    });

    const registry = createRegistry(catalog);
    const result = await registry.runScenario(child);

    expect(result.byName("viewerUser")).toMatchObject({ name: "Overridden" });
    // org should still be inherited from parent
    expect(result.byName("acme")).toBeDefined();
  });

  it("multi-parent merge combines prototypes from both parents", async () => {
    const parentA = defineScenario(catalog, {
      name: "parentA",
      prototypes: {
        organizations: { acme: {} },
      },
    });

    const parentB = defineScenario(catalog, {
      name: "parentB",
      prototypes: {
        users: { adminUser: {} },
      },
    });

    const merged = defineScenario(catalog, {
      name: "merged",
      extends: [parentA, parentB],
      prototypes: {},
    });

    const mat = materializeScenario(merged);
    // Should have prototypes from both parents
    expect(mat.prototypes.organizations).toBeDefined();
    expect(mat.prototypes.users).toBeDefined();
  });

  it("detects inheritance cycle", () => {
    const scenarioA: any = defineScenario(catalog, {
      name: "cycleA",
      prototypes: { organizations: { acme: {} } },
    });

    const scenarioB: any = defineScenario(catalog, {
      name: "cycleB",
      extends: scenarioA,
      prototypes: {},
    });

    // Mutate to create cycle
    scenarioA.extends = [scenarioB];

    expect(() => materializeScenario(scenarioA)).toThrow(ScenarioInheritanceCycleError);
  });
});

// --- depField resolution ---

describe("depField resolution", () => {
  it("resolves a field from a dependency record", async () => {
    const scenario = defineScenario(catalog, {
      name: "depFieldTest",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: {
            organization_id: depField(ref("organizations", "acme"), "slug"),
          },
        },
      },
    });

    const registry = createRegistry(catalog);
    const result = await registry.runScenario(scenario);
    const user = result.mustGet(users.viewerUser);
    // depField extracts the "slug" field instead of using the id
    expect(user.organization_id).toBe("acme");
  });
});

// --- Dynamic values ---

describe("dynamic values", () => {
  it("evaluates dynamic functions at create time", async () => {
    const scenario = defineScenario(catalog, {
      name: "dynamicTest",
      prototypes: {
        organizations: {
          acme: {
            name: dynamic(({ seq }) => `Org-${seq}`),
          },
        },
      },
    });

    const registry = createRegistry(catalog);
    const result = await registry.runScenario(scenario);
    const org = result.mustGet(organizations.acme);
    expect(org.name).toMatch(/^Org-\d+$/);
  });
});

// --- Create precedence (override > resource) ---

describe("create precedence", () => {
  it("override-level create beats resource-level handler", async () => {
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ attrs }) => ({
          id: "from-resource",
          ...attrs,
        }),
      },
    });

    const scenario = defineScenario(catalog, {
      name: "precedence",
      prototypes: {
        organizations: {
          acme: override(
            {},
            {
              create: ({ attrs }: CreateContext) => ({
                id: "from-override",
                ...attrs,
              }),
            },
          ),
        },
      },
    });

    const result = await registry.runScenario(scenario);
    expect(result.byName("acme")!.id).toBe("from-override");
  });
});

// --- Actor / authorize ---

describe("actor and authorize handling", () => {
  it("resolves actor ref and sets authorize to true", async () => {
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
      name: "withActor",
      prototypes: {
        organizations: { acme: {} },
        users: {
          viewerUser: override({}, { actor: ref("organizations", "acme") }),
        },
      },
    });

    await registry.runScenario(scenario);
    expect(capturedCtx!.actor).toMatchObject({ name: "Acme" });
    expect(capturedCtx!.authorize).toBe(true);
  });
});

// --- tenantFrom ---

describe("tenantFrom extraction", () => {
  it("extracts tenant from resolved attr", async () => {
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

    await registry.runScenario(scenario);
    expect(capturedCtx!.tenant).toBeDefined();
    expect(typeof capturedCtx!.tenant).toBe("string");
  });
});

// --- Fixture $ref and $dynamic ---

describe("fixture $ref and $dynamic", () => {
  it("compiles $ref and resolves dependencies", async () => {
    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } },
        "users:alice": { "attrs": { "name": "Alice", "role": "viewer", "organization_id": "$ref:organizations:acme" } }
      }
    }`);

    const registry = createRegistry(catalog);
    fixture.build(registry);

    const result = await registry.run([fixture.ref("users:alice")]);
    const user = result.byName("alice");
    const org = result.byName("acme");
    expect(user!.organization_id).toBe(org!.id);
  });

  it("compiles $dynamic and evaluates at create time", async () => {
    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:dynOrg": { "attrs": { "name": "$dynamic", "slug": "dyn" } }
      }
    }`);

    const registry = createRegistry(catalog);
    fixture.addDynamic(fixture.ref("organizations:dynOrg"), "name", ({ seq }) => `Org-${seq}`);
    fixture.build(registry);

    const result = await registry.run([fixture.ref("organizations:dynOrg")]);
    const org = result.byName("dynOrg");
    expect(org!.name).toMatch(/^Org-\d+$/);
  });
});
