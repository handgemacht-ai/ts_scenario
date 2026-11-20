import {
  definePrototypes,
  defineScenario,
  override,
  ref,
  type PrototypeHandle,
  type ResourceKey,
  type ResourceRecord,
  type RunResult,
} from "../src/index.js";
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
        // Cross-resource ref allowed at type level since ScenarioPrototypeMap accepts TaggedRuntimeValue
        author_id: ref("organizations", "acme"),
      },
    },
  },
});

function readKnownFieldWithItsType(result: RunResult<typeof catalog>): string {
  return result.mustGet(catalog.organizations.acme).slug;
}

function readUnionFieldWithItsType(
  result: RunResult<typeof catalog>,
): "viewer" | "admin" | "editor" | undefined {
  return result.get(catalog.users.viewerUser)?.role;
}

function rejectUnknownField(result: RunResult<typeof catalog>): void {
  // @ts-expect-error organizations records have no such field
  result.mustGet(catalog.organizations.acme).nope;
}

function rejectWrongTypeAssignment(result: RunResult<typeof catalog>): number {
  // @ts-expect-error organizations.slug is a string
  return result.mustGet(catalog.organizations.acme).slug;
}

defineScenario(catalog, {
  name: "fixedIdOverride",
  prototypes: {
    organizations: {
      acme: { id: "org-fixed" },
    },
  },
});

defineScenario(catalog, {
  name: "fixedIdOverrideWithOptions",
  prototypes: {
    organizations: {
      acme: override({ id: "org-fixed" }, { action: "seed" }),
    },
  },
});

type Result = Pick<RunResult<typeof catalog>, "get">;
type ResourceName = keyof typeof catalog & ResourceKey;

function worldGet<R extends ResourceName, N extends keyof (typeof catalog)[R] & string>(
  result: Result,
  resource: R,
  name: N,
): ResourceRecord<R> {
  const record = result.get(handleFor(resource, name));
  if (!record) {
    throw new Error(`missing ${resource}.${name}`);
  }
  return record;
}

function handleFor<R extends ResourceName, N extends keyof (typeof catalog)[R] & string>(
  resource: R,
  name: N,
): PrototypeHandle<R, string> {
  return catalog[resource][name] as PrototypeHandle<R, string>;
}
