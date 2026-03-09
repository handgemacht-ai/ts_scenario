import { describe, expect, it } from "vitest";

import { defineScenario, materializeScenario, ref } from "../src/index.js";
import { catalog, organizations, posts, users } from "./fixtures/prototypes.js";

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
      releasePost: {},
    },
  },
});

const launchDay = defineScenario(catalog, {
  name: "launchDay",
  extends: [baseContent, editorialReview],
  prototypes: {
    organizations: {
      acme: {
        slug: "launch-acme",
      },
    },
    posts: {
      draftPost: {
        title: "Launch day post",
        author_id: ref("users", "adminUser"),
      },
    },
  },
});

describe("prototype DX exploration", () => {
  it("builds typed prototype handles without dep wrappers", () => {
    const typedAuthorRef: typeof posts.draftPost.input.author_id = ref("users", "adminUser");

    expect(users.viewerUser.ref).toEqual({
      $kind: "prototype-ref",
      resource: "users",
      prototype: "viewerUser",
    });

    expect(posts.draftPost.input.organization_id).toEqual(ref("organizations", "acme"));
    expect(typedAuthorRef).toEqual(ref("users", "adminUser"));
  });

  it("materializes nested scenario maps with child-wins merge semantics", () => {
    const materialized = materializeScenario(launchDay);

    expect(materialized.prototypes.organizations?.acme).toEqual({
      slug: "launch-acme",
    });

    expect(materialized.prototypes.users?.viewerUser).toEqual({
      role: "editor",
    });

    expect(materialized.prototypes.posts?.draftPost).toEqual({
      status: "review",
      title: "Launch day post",
      author_id: ref("users", "adminUser"),
    });

    expect(materialized.prototypes.posts?.releasePost).toEqual({});
  });

  it("keeps prototype and scenario names visible in the DX", () => {
    expect(organizations.acme.name).toBe("acme");
    expect(baseContent.name).toBe("baseContent");
    expect(editorialReview.extends).toHaveLength(1);
    expect(launchDay.extends).toHaveLength(2);
  });
});
