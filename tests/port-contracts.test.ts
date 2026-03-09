import { describe, expect, it } from "vitest";

import { createRegistry, ref } from "../src/index.js";
import { catalog } from "./fixtures/prototypes.js";

describe("port contracts wired via memory adapters", () => {
  it("PrototypeStorePort: registry resolves prototypes through the store port", async () => {
    const registry = createRegistry(catalog);

    // Running a single handle should look up the prototype via PrototypeStorePort
    const result = await registry.run([catalog.organizations.acme]);

    const acme = result.mustGet(catalog.organizations.acme);
    expect(acme).toMatchObject({ name: "Acme", slug: "acme" });
    expect(acme.id).toBeTypeOf("string");
  });

  it("CreatePort: custom create handler receives CreateContext and returns record", async () => {
    const contexts: Array<{ resource: string; prototype: string; mode: string }> = [];

    const registry = createRegistry(catalog, {
      create: {
        organizations: (ctx) => {
          contexts.push({ resource: ctx.resource, prototype: ctx.prototype, mode: ctx.mode });
          return { id: "custom-org-1", ...ctx.attrs };
        },
      },
    });

    const result = await registry.run([catalog.organizations.acme]);

    expect(contexts).toEqual([
      { resource: "organizations", prototype: "acme", mode: "persisted" },
    ]);
    expect(result.mustGet(catalog.organizations.acme)).toMatchObject({
      id: "custom-org-1",
      name: "Acme",
    });
  });

  it("SequencePort: default id generation follows resource:prototype:N pattern", async () => {
    const registry = createRegistry(catalog);

    const result = await registry.run([
      catalog.organizations.acme,
      catalog.organizations.beta,
    ]);

    const acmeId = result.mustGet(catalog.organizations.acme).id as string;
    const betaId = result.mustGet(catalog.organizations.beta).id as string;

    // IDs must follow the sequence pattern
    expect(acmeId).toMatch(/^organizations:acme:\d+$/);
    expect(betaId).toMatch(/^organizations:beta:\d+$/);

    // Sequence numbers must be distinct
    const acmeSeq = Number.parseInt(acmeId.split(":")[2]!, 10);
    const betaSeq = Number.parseInt(betaId.split(":")[2]!, 10);
    expect(betaSeq).toBeGreaterThan(acmeSeq);
  });

  it("ClockPort: memory clock adapter provides timestamps when available", async () => {
    // ClockPort is a new contract — once implemented, adapters/memory should
    // expose a MemoryClockAdapter that createRegistry can optionally wire.
    // For now, verify the adapter module exists and exports the class.
    const adapters = await import("../src/adapters/index.js");

    expect(adapters.MemoryClockAdapter).toBeTypeOf("function");
  });
});
