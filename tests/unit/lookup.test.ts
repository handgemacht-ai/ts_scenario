import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog } from "../fixtures/prototypes.js";

async function aRunWithAcme() {
  return createRegistry(catalog).run([catalog.organizations.acme]);
}

describe("RunResult.lookup(resource, name)", () => {
  it("returns the same record as mustGet with the handle", async () => {
    const result = await aRunWithAcme();

    expectSameRecord(
      result.lookup("organizations", "acme"),
      result.mustGet(catalog.organizations.acme),
    );
  });

  it("throws for a prototype that was not created", async () => {
    const result = await aRunWithAcme();

    expect(() => result.lookup("organizations", "beta")).toThrow(
      "Missing record for organizations:beta",
    );
  });
});

function expectSameRecord(actual: unknown, expected: unknown): void {
  expect(actual).toBe(expected);
}
