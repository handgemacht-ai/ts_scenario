import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog } from "../fixtures/prototypes.js";

// All tests import from modules that do not exist yet.
// Expected error classes from src/domain/errors.ts:
//   FixtureParseError, FixtureNotBuiltError, FixtureUnknownKeyError, FixtureUnboundDynamicError
// Expected API surface from src/public/fixturegen.ts:
//   fixturegen.parse(input: string | object) → Fixture

// --- SF1/SF6: Inline fixture parsing ---

describe("fixturegen.parse() inline JSON", () => {
  it("parses a JSON string with static attrs and produces correct records via registry.run", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } }
      }
    }`);

    const ref = fixture.ref("organizations:acme");
    expect(ref).toEqual({
      $kind: "prototype-ref",
      resource: "organizations",
      prototype: "acme",
    });

    const registry = createRegistry(catalog);
    fixture.build(registry);

    const result = await registry.run([ref]);
    const org = result.byName("acme");
    expect(org).toBeDefined();
    expect(org!.name).toBe("Acme");
    expect(org!.slug).toBe("acme");
  });
});

// --- SF4: $ref resolution (persisted mode) ---

describe("$ref:resource:prototype resolution", () => {
  it("compiles $ref to the same dependency model — resolves to dep id in persisted mode", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

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
    expect(user).toBeDefined();
    expect(org).toBeDefined();
    expect(user!.organization_id).toBe(org!.id);
  });

  it("compiles $ref to full record in struct mode", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } },
        "users:alice": { "attrs": { "name": "Alice", "role": "viewer", "organization_id": "$ref:organizations:acme" } }
      }
    }`);

    const registry = createRegistry(catalog);
    fixture.build(registry);

    const result = await registry.run([fixture.ref("users:alice")], { mode: "struct" });
    const user = result.byName("alice");
    expect(user).toBeDefined();
    // In struct mode, the $ref should resolve to the full organization record
    expect(user!.organization_id).toEqual(
      expect.objectContaining({ name: "Acme", slug: "acme" }),
    );
  });
});

// --- SF4/SF5: $dynamic placeholders ---

describe("$dynamic placeholder", () => {
  it("requires explicit addDynamic binding and produces dynamic values with sequence", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } },
        "users:alice": { "attrs": { "name": "$dynamic", "role": "viewer", "organization_id": "$ref:organizations:acme" } }
      }
    }`);

    const ref = fixture.ref("users:alice");
    fixture.addDynamic(ref, "name", (ctx) => `user-${ctx.seq}`);

    const registry = createRegistry(catalog);
    fixture.build(registry);

    const r1 = await registry.run([ref]);
    const r2 = await registry.run([ref]);
    const u1 = r1.byName("alice");
    const u2 = r2.byName("alice");
    expect(u1).toBeDefined();
    expect(u2).toBeDefined();
    expect(u1!.name).toMatch(/^user-\d+$/);
    expect(u2!.name).toMatch(/^user-\d+$/);
    // Sequence should produce different values across runs
    expect(u1!.name).not.toBe(u2!.name);
  });
});

// --- SF5: Idempotent build ---

describe("build(registry) idempotency", () => {
  it("repeated build calls are no-ops and do not duplicate prototype registration", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } }
      }
    }`);

    const registry = createRegistry(catalog);
    fixture.build(registry);
    fixture.build(registry); // second call must be a no-op

    const result = await registry.run([fixture.ref("organizations:acme")]);
    expect(result.byName("acme")).toBeDefined();
    expect(result.byName("acme")!.name).toBe("Acme");
  });
});

// --- SF1: Error — instance() before build ---

describe("FixtureNotBuiltError", () => {
  it("instance() before build() throws FixtureNotBuiltError", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");
    const { FixtureNotBuiltError } = await import("../../src/domain/errors.js");

    // Uses $dynamic to prevent auto-build
    const fixture = fixturegen.parse(`{
      "prototypes": {
        "users:alice": { "attrs": { "name": "$dynamic", "role": "viewer" } }
      }
    }`);

    expect(() => fixture.instance("users:alice")).toThrow(FixtureNotBuiltError);
  });
});

// --- SF1: Error — unbound $dynamic ---

describe("FixtureUnboundDynamicError", () => {
  it("build() with unbound $dynamic throws FixtureUnboundDynamicError", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");
    const { FixtureUnboundDynamicError } = await import("../../src/domain/errors.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } },
        "users:alice": { "attrs": { "name": "$dynamic", "role": "viewer", "organization_id": "$ref:organizations:acme" } }
      }
    }`);

    const registry = createRegistry(catalog);
    expect(() => fixture.build(registry)).toThrow(FixtureUnboundDynamicError);
  });
});

// --- SF4: Error — unknown $ref in JSON ---

describe("unknown $ref in JSON", () => {
  it("build() throws when $ref references a prototype not defined in the fixture", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "users:alice": { "attrs": { "name": "Alice", "role": "viewer", "organization_id": "$ref:organizations:missing" } }
      }
    }`);

    const registry = createRegistry(catalog);
    expect(() => fixture.build(registry)).toThrow(/unknown|not found/i);
  });
});

// --- SF1: Error — unknown key in instance() ---

describe("FixtureUnknownKeyError", () => {
  it("instance() with nonexistent key throws FixtureUnknownKeyError", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");
    const { FixtureUnknownKeyError } = await import("../../src/domain/errors.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } }
      }
    }`);

    const registry = createRegistry(catalog);
    fixture.build(registry);

    expect(() => fixture.instance("organizations:nonexistent")).toThrow(FixtureUnknownKeyError);
  });
});

// --- SF1: Error — invalid JSON ---

describe("FixtureParseError", () => {
  it("parse() with invalid JSON throws FixtureParseError", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");
    const { FixtureParseError } = await import("../../src/domain/errors.js");

    expect(() => fixturegen.parse("{invalid json")).toThrow(FixtureParseError);
  });
});

// --- SF5: addCreate enters create-precedence chain ---

describe("addCreate(resource, createFn)", () => {
  it("fixture create handlers enter the same create-precedence chain", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } }
      }
    }`);

    fixture.addCreate("organizations", async (ctx) => ({
      id: "fixture-custom-id",
      ...ctx.input,
    }));

    const registry = createRegistry(catalog);
    fixture.build(registry);

    const result = await registry.run([fixture.ref("organizations:acme")]);
    const org = result.byName("acme");
    expect(org).toBeDefined();
    expect(org!.id).toBe("fixture-custom-id");
  });
});

// --- Full chain: 3-level hierarchy ---

describe("full 3-level hierarchy", () => {
  it("org → user → post with $ref + $dynamic through the same engine", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } },
        "users:alice": { "attrs": { "name": "$dynamic", "role": "viewer", "organization_id": "$ref:organizations:acme" } },
        "posts:draft": { "attrs": { "title": "Welcome draft", "status": "draft", "author_id": "$ref:users:alice", "organization_id": "$ref:organizations:acme" } }
      }
    }`);

    const userRef = fixture.ref("users:alice");
    fixture.addDynamic(userRef, "name", (ctx) => `user-${ctx.seq}`);

    const registry = createRegistry(catalog);
    fixture.build(registry);

    const result = await registry.run([fixture.ref("posts:draft")]);
    const org = result.byName("acme");
    const user = result.byName("alice");
    const post = result.byName("draft");

    expect(org).toBeDefined();
    expect(user).toBeDefined();
    expect(post).toBeDefined();

    // Verify dependency chain resolved correctly
    expect(user!.organization_id).toBe(org!.id);
    expect(post!.author_id).toBe(user!.id);
    expect(post!.organization_id).toBe(org!.id);
    expect(user!.name).toMatch(/^user-\d+$/);
  });
});

// --- Auto-build behavior ---

describe("auto-build behavior", () => {
  it("parse without $dynamic auto-builds — instance() works immediately", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } }
      }
    }`);

    // No explicit build() call — should work because no $dynamic
    const handle = fixture.instance("organizations:acme");
    expect(handle).toBeDefined();
  });

  it("parse with $dynamic does NOT auto-build — instance() throws before addDynamic + build", async () => {
    const { fixturegen } = await import("../../src/public/fixturegen.js");
    const { FixtureNotBuiltError } = await import("../../src/domain/errors.js");

    const fixture = fixturegen.parse(`{
      "prototypes": {
        "users:alice": { "attrs": { "name": "$dynamic", "role": "viewer", "organization_id": "$ref:organizations:acme" } },
        "organizations:acme": { "attrs": { "name": "Acme", "slug": "acme" } }
      }
    }`);

    // Has $dynamic → not auto-built → instance() should throw
    expect(() => fixture.instance("users:alice")).toThrow(FixtureNotBuiltError);
  });
});
