import { defineCatalog, definePrototypes, ref } from "../../src/index.js";
import "./schema.js";

export const organizations = definePrototypes("organizations", {
  acme: {
    name: "Acme",
    slug: "acme",
  },
  beta: {
    name: "Beta",
    slug: "beta",
  },
});

export const users = definePrototypes("users", {
  viewerUser: {
    name: "Alice",
    role: "viewer",
    organization_id: ref("organizations", "acme"),
  },
  adminUser: {
    name: "Marco",
    role: "admin",
    organization_id: ref("organizations", "acme"),
  },
});

export const posts = definePrototypes("posts", {
  draftPost: {
    title: "Welcome draft",
    status: "draft",
    author_id: ref("users", "viewerUser"),
    organization_id: ref("organizations", "acme"),
  },
  releasePost: {
    title: "Release notes",
    status: "review",
    author_id: ref("users", "adminUser"),
    organization_id: ref("organizations", "acme"),
  },
});

export const catalog = defineCatalog({
  organizations,
  users,
  posts,
});
