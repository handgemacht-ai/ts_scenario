import { definePrototypes, defineScenario, ref } from "../src/index.js";
import { catalog } from "./fixtures/prototypes.js";
import "./fixtures/schema.js";

defineScenario(catalog, {
  name: "typedScenario",
  prototypes: {
    users: {
      viewerUser: {
        role: "admin",
      },
    },
  },
});

definePrototypes("users", {
  validUser: {
    name: "Valid",
    role: "viewer",
    organization_id: ref("organizations", "acme"),
  },
});

definePrototypes("users", {
  brokenUser: {
    name: "Broken",
    role: "viewer",
    // @ts-expect-error users.organization_id must reference an organization prototype
    organization_id: ref("users", "viewerUser"),
  },
});

defineScenario(catalog, {
  name: "badField",
  prototypes: {
    users: {
      viewerUser: {
        // @ts-expect-error unknown override field
        nope: true,
      },
    },
  },
});

defineScenario(catalog, {
  name: "badPrototypeName",
  prototypes: {
    users: {
      // @ts-expect-error unknown prototype name for users
      missingUser: {
        role: "viewer",
      },
    },
  },
});

defineScenario(catalog, {
  name: "badReference",
  prototypes: {
    posts: {
      draftPost: {
        // @ts-expect-error posts.author_id must reference a user prototype
        author_id: ref("organizations", "acme"),
      },
    },
  },
});
