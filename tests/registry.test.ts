import { describe, expect, it } from "vitest";

import { createRegistry, defineScenario, ref } from "../src/index.js";
import { catalog } from "./fixtures/prototypes.js";

const baseContent = defineScenario(catalog, {
  name: "baseContent",
  prototypes: {
    organizations: {
      acme: {},
    },
    users: {
      viewerUser: {},
    },
    posts: {
      draftPost: {},
    },
  },
});

const editorialReview = defineScenario(catalog, {
  name: "editorialReview",
  extends: baseContent,
  prototypes: {
    users: {
      viewerUser: {
        role: "editor",
      },
    },
    posts: {
      draftPost: {
        status: "review",
      },
    },
  },
});

describe("registry execution", () => {
  it("runs a scenario in persisted mode with inferred dependencies", async () => {
    const registry = createRegistry(catalog);

    const result = await registry.runScenario(editorialReview);

    expect(result.byName("acme")).toEqual({
      id: "organizations:acme:1",
      name: "Acme",
      slug: "acme",
    });

    expect(result.byName("viewerUser")).toEqual({
      id: "users:viewerUser:2",
      name: "Alice",
      role: "editor",
      organization_id: "organizations:acme:1",
    });

    expect(result.byName("draftPost")).toEqual({
      id: "posts:draftPost:3",
      title: "Welcome draft",
      status: "review",
      author_id: "users:viewerUser:2",
      organization_id: "organizations:acme:1",
    });
  });

  it("runs in struct mode by preserving dependency objects", async () => {
    const registry = createRegistry(catalog);
    const result = await registry.runScenario(editorialReview, { mode: "struct" });

    const organization = result.byName("acme");
    const user = result.byName("viewerUser");
    const post = result.byName("draftPost");

    expect(organization).toMatchObject({
      id: "organizations:acme:1",
      name: "Acme",
    });

    expect(user).toMatchObject({
      role: "editor",
      organization_id: organization,
    });

    expect(post).toMatchObject({
      status: "review",
      author_id: user,
      organization_id: organization,
    });
  });

  it("creates shared dependencies once in a diamond graph", async () => {
    const calls: string[] = [];
    const registry = createRegistry(catalog, {
      create: {
        organizations: ({ prototype, attrs }) => {
          calls.push(`organizations:${prototype}`);
          return { id: `org:${prototype}`, ...attrs };
        },
        users: ({ prototype, attrs }) => {
          calls.push(`users:${prototype}`);
          return { id: `user:${prototype}`, ...attrs };
        },
        posts: ({ prototype, attrs }) => {
          calls.push(`posts:${prototype}`);
          return { id: `post:${prototype}`, ...attrs };
        },
      },
    });

    await registry.runScenario(editorialReview);

    expect(calls).toEqual([
      "organizations:acme",
      "users:viewerUser",
      "posts:draftPost",
    ]);
  });

  it("supports direct prototype runs with nested overrides", async () => {
    const registry = createRegistry(catalog);

    const result = await registry.run([catalog.posts.draftPost], {
      overrides: {
        posts: {
          draftPost: {
            title: "Launch draft",
            author_id: ref("users", "adminUser"),
          },
        },
      },
    });

    expect(result.byName("adminUser")).toEqual({
      id: "users:adminUser:2",
      name: "Marco",
      role: "admin",
      organization_id: "organizations:acme:1",
    });

    expect(result.byName("draftPost")).toEqual({
      id: "posts:draftPost:3",
      title: "Launch draft",
      status: "draft",
      author_id: "users:adminUser:2",
      organization_id: "organizations:acme:1",
    });
  });
});
