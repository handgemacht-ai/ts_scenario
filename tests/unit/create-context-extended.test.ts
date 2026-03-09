import { describe, expect, it } from "vitest";

import {
  createRegistry,
  defineScenario,
  ref,
} from "../../src/index.js";
import type { CreateContext } from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog, organizations, users } from "../fixtures/prototypes.js";

// --- Extended CreateContext shape ---

describe("extended CreateContext", () => {
  it("includes ref field with resource and prototype", async () => {
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
      name: "ctxRef",
      prototypes: { organizations: { acme: {} } },
    });

    await registry.runScenario(scenario);

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.ref).toEqual({
      $kind: "prototype-ref",
      resource: "organizations",
      prototype: "acme",
    });
  });

  it("includes runCtx from run options", async () => {
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
      name: "ctxRunCtx",
      prototypes: { organizations: { acme: {} } },
    });

    await registry.runScenario(scenario, { runCtx: { env: "test", seed: 42 } });

    expect(capturedCtx!.runCtx).toEqual({ env: "test", seed: 42 });
  });

  it("includes results with already-created records", async () => {
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
      name: "ctxResults",
      prototypes: {
        organizations: { acme: {} },
        users: { viewerUser: {} },
      },
    });

    await registry.runScenario(scenario);

    // By the time user is created, org should be in results
    expect(capturedCtx!.results).toBeDefined();
    const org = capturedCtx!.results.mustGet(ref("organizations", "acme"));
    expect(org.name).toBe("Acme");
  });

  it("includes action metadata when set", async () => {
    const { override } = await import("../../src/index.js");

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
      name: "ctxAction",
      prototypes: {
        organizations: {
          acme: override({}, { action: "seed" }),
        },
      },
    });

    await registry.runScenario(scenario);
    expect(capturedCtx!.action).toBe("seed");
  });

  it("action defaults to undefined when not set", async () => {
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
      name: "ctxNoAction",
      prototypes: { organizations: { acme: {} } },
    });

    await registry.runScenario(scenario);
    // The property must exist on the context object (not just be missing)
    expect("action" in capturedCtx!).toBe(true);
    expect(capturedCtx!.action).toBeUndefined();
  });

  it("actor is undefined when no actor is set", async () => {
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
      name: "ctxNoActor",
      prototypes: { organizations: { acme: {} } },
    });

    await registry.runScenario(scenario);
    expect("actor" in capturedCtx!).toBe(true);
    expect(capturedCtx!.actor).toBeUndefined();
  });

  it("tenant is undefined when tenantFrom is not set", async () => {
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
      name: "ctxNoTenant",
      prototypes: { organizations: { acme: {} } },
    });

    await registry.runScenario(scenario);
    expect("tenant" in capturedCtx!).toBe(true);
    expect(capturedCtx!.tenant).toBeUndefined();
  });
});

// --- Null attr clearing through create handler ---

describe("null attr clearing through execution", () => {
  it("null override clears inherited attr and passes null to create handler", async () => {
    let capturedAttrs: Record<string, unknown> | undefined;
    const registry = createRegistry(catalog, {
      create: {
        organizations: (ctx) => {
          capturedAttrs = { ...ctx.attrs };
          return { id: "org:1", ...ctx.attrs };
        },
      },
    });

    const parent = defineScenario(catalog, {
      name: "parentSlug",
      prototypes: {
        organizations: {
          acme: { slug: "parent-slug" },
        },
      },
    });

    const child = defineScenario(catalog, {
      name: "childNull",
      extends: parent,
      prototypes: {
        organizations: {
          acme: { slug: null as any },
        },
      },
    });

    await registry.runScenario(child);

    // null should survive into the create handler attrs (not be filtered out)
    expect(capturedAttrs).toBeDefined();
    expect("slug" in capturedAttrs!).toBe(true);
    expect(capturedAttrs!.slug).toBeNull();
  });
});
