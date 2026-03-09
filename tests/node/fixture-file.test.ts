import { describe, expect, it } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createRegistry } from "../../src/index.js";
import "../fixtures/schema.js";
import { catalog } from "../fixtures/prototypes.js";

// Node-runtime file-based fixture parsing.
// parseFixtureFile must live in the node runtime entry, not the browser-safe root.

describe("parseFixtureFile (node runtime)", () => {
  it("reads a JSON file and delegates to the same parser", async () => {
    const { parseFixtureFile } = await import("../../src/runtime/node.js");

    const dir = await mkdtemp(join(tmpdir(), "fixturegen-"));
    const filePath = join(dir, "fixtures.json");
    await writeFile(
      filePath,
      JSON.stringify({
        prototypes: {
          "organizations:acme": { attrs: { name: "FromFile", slug: "from-file" } },
        },
      }),
    );

    try {
      const fixture = await parseFixtureFile(filePath);

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
      expect(org!.name).toBe("FromFile");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("throws when the file does not exist", async () => {
    const { parseFixtureFile } = await import("../../src/runtime/node.js");

    await expect(parseFixtureFile("/nonexistent/fixtures.json")).rejects.toThrow();
  });
});
