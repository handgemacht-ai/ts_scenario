/**
 * Advanced example — complex types, dynamic values, scenario inheritance,
 * actor/authorize, tenantFrom, create precedence, and seed helpers.
 *
 * Demonstrates the full power of ts_scenario's type system and runtime
 * features for realistic multi-tenant SaaS test data.
 */

import type { Link } from "../src/domain/types.js";
import type { CreateContext } from "../src/index.js";
import {
  createRegistry,
  defineCatalog,
  definePrototypes,
  defineScenario,
  depField,
  dynamic,
  entry,
  override,
  prototype,
  ref,
  seed,
  testing,
} from "../src/index.js";

// ─── 1. Complex type declarations ──────────────────────────────
//
// Module augmentation gives you full type safety: ref() targets are
// checked, scenario overrides are validated, and Link<> enforces
// correct cross-resource references.

declare module "../src/domain/types.js" {
  interface TsScenarioResources {
    organizations: {
      input: {
        name: string;
        slug: string;
        billing_email: string;
        plan: "starter" | "team" | "enterprise";
        settings: { sso_enabled: boolean; max_seats: number };
      };
      record: {
        id: string;
        name: string;
        slug: string;
        billing_email: string;
        plan: "starter" | "team" | "enterprise";
        settings: { sso_enabled: boolean; max_seats: number };
      };
    };
    users: {
      input: {
        name: string;
        email: string;
        role: "owner" | "admin" | "member" | "guest";
        organization_id: Link<"organizations">;
      };
      record: {
        id: string;
        name: string;
        email: string;
        role: "owner" | "admin" | "member" | "guest";
        organization_id: string;
      };
    };
    projects: {
      input: {
        title: string;
        visibility: "public" | "private" | "internal";
        owner_id: Link<"users">;
        organization_id: Link<"organizations">;
      };
      record: {
        id: string;
        title: string;
        visibility: "public" | "private" | "internal";
        owner_id: string;
        organization_id: string;
        created_at: string;
      };
    };
    tasks: {
      input: {
        summary: string;
        priority: 0 | 1 | 2 | 3;
        project_id: Link<"projects">;
        assignee_id: Link<"users">;
      };
      record: {
        id: string;
        summary: string;
        priority: 0 | 1 | 2 | 3;
        project_id: string;
        assignee_id: string;
        seq: number;
      };
    };
  }
}

// ─── 2. Prototypes with metadata ────────────────────────────────
//
// prototype() wraps attrs with metadata like actor, authorize, or
// custom create handlers. Plain objects work too — prototype() is
// optional syntactic sugar.

const organizations = definePrototypes("organizations", {
  acme: {
    name: "Acme Corp",
    slug: "acme",
    billing_email: "billing@acme.com",
    plan: "team",
    settings: { sso_enabled: false, max_seats: 25 },
  },
  globex: prototype(
    {
      name: "Globex Industries",
      slug: "globex",
      billing_email: "admin@globex.io",
      plan: "enterprise",
      settings: { sso_enabled: true, max_seats: 500 },
    },
    {
      // Prototype-level create handler — beats resource-level handler
      create: ({ attrs }: CreateContext) => ({
        id: `org_globex_custom`,
        ...attrs,
      }),
    },
  ),
});

const users = definePrototypes("users", {
  alice: {
    name: "Alice Chen",
    email: "alice@acme.com",
    role: "owner",
    organization_id: ref("organizations", "acme"),
  },
  bob: {
    name: "Bob Smith",
    email: "bob@acme.com",
    role: "admin",
    organization_id: ref("organizations", "acme"),
  },
  carol: {
    name: "Carol Davis",
    email: "carol@globex.io",
    role: "member",
    organization_id: ref("organizations", "globex"),
  },
});

const projects = definePrototypes("projects", {
  website: {
    title: "Website Redesign",
    visibility: "internal",
    owner_id: ref("users", "alice"),
    organization_id: ref("organizations", "acme"),
  },
  api: {
    title: "API Platform",
    visibility: "private",
    owner_id: ref("users", "bob"),
    organization_id: ref("organizations", "acme"),
  },
});

const tasks = definePrototypes("tasks", {
  designReview: {
    summary: "Review design mockups",
    priority: 1,
    project_id: ref("projects", "website"),
    assignee_id: ref("users", "alice"),
  },
  apiEndpoints: {
    summary: "Implement REST endpoints",
    priority: 0,
    project_id: ref("projects", "api"),
    // depField: resolve the assignee_id by reading bob's id at runtime
    assignee_id: depField(ref("users", "bob"), "id"),
  },
  bugFix: {
    summary: "Fix auth token expiry",
    priority: 2,
    project_id: ref("projects", "api"),
    assignee_id: ref("users", "bob"),
  },
});

const catalog = defineCatalog({ organizations, users, projects, tasks });

// ─── 3. Dynamic values ─────────────────────────────────────────
//
// dynamic() computes values at execution time. The callback receives
// a context with seqIndex (deterministic counter per attr), the ref
// being created, and access to all previously created results.

const tasksWithDynamicSeq = definePrototypes("tasks", {
  designReview: {
    summary: "Review design mockups",
    priority: 1,
    project_id: ref("projects", "website"),
    assignee_id: ref("users", "alice"),
  },
  apiEndpoints: {
    // dynamic() generates a unique summary per instance
    summary: dynamic(({ seq }) => `Task #${seq}: Implement endpoints`),
    priority: 0,
    project_id: ref("projects", "api"),
    assignee_id: ref("users", "bob"),
  },
});

// ─── 4. Scenario inheritance ────────────────────────────────────
//
// Scenarios can extend parents. Multiple parents merge left-to-right,
// and the child's overrides always win. Use null to explicitly clear
// an inherited attribute.

const baseScenario = defineScenario(catalog, {
  name: "base",
  prototypes: {
    organizations: { acme: {} },
    users: { alice: {}, bob: {} },
    projects: { website: {} },
  },
});

const fullScenario = defineScenario(catalog, {
  name: "full",
  extends: baseScenario,
  prototypes: {
    // Inherit everything from base, add more
    projects: { api: {} },
    tasks: { designReview: {}, apiEndpoints: {}, bugFix: {} },
  },
});

// Multi-parent: merge two scenarios, child overrides win
const ssoScenario = defineScenario(catalog, {
  name: "ssoEnabled",
  prototypes: {
    organizations: {
      acme: { settings: { sso_enabled: true, max_seats: 100 } },
    },
  },
});

const ssoFullScenario = defineScenario(catalog, {
  name: "ssoFull",
  extends: [fullScenario, ssoScenario],
  prototypes: {
    // Child override: upgrade plan to enterprise
    organizations: { acme: { plan: "enterprise" } },
  },
});

// ─── 5. Actor, authorize, and tenantFrom ────────────────────────
//
// override() wraps attrs with per-entry metadata. When actor is set,
// authorize defaults to true. tenantFrom extracts a resolved attr
// as the tenant context.

const authorizedScenario = defineScenario(catalog, {
  name: "authorized",
  extends: baseScenario,
  prototypes: {
    projects: {
      website: override(
        { visibility: "public" },
        {
          // Create the project "as" alice (actor), with authorization
          actor: ref("users", "alice"),
          // authorize: true is implied by actor presence
          // Extract organization_id as tenant context
          tenantFrom: "organization_id",
        },
      ),
    },
  },
});

// ─── 6. Registry with create handlers ───────────────────────────

let idCounter = 1;
let taskSeq = 100;

const registry = createRegistry(catalog, {
  create: {
    organizations: ({ attrs }) => ({
      id: `org_${idCounter++}`,
      ...attrs,
    }),
    users: ({ attrs }) => ({
      id: `user_${idCounter++}`,
      ...attrs,
    }),
    projects: ({ attrs, actor, authorize, tenant }) => {
      console.log("  project create context:", { actor: !!actor, authorize, tenant });
      return {
        id: `proj_${idCounter++}`,
        ...attrs,
        created_at: new Date().toISOString(),
      };
    },
    tasks: ({ attrs }) => ({
      id: `task_${idCounter++}`,
      ...attrs,
      seq: taskSeq++,
    }),
  },
});

// ─── 7. Run scenarios ───────────────────────────────────────────

console.log("=== Full scenario ===");
const fullResult = await registry.runScenario(fullScenario);
console.log("Tasks created:", fullResult.entries().length, "records");

console.log("\n=== Authorized scenario (with actor + tenant) ===");
registry.resetSequences();
idCounter = 1;
const authResult = await registry.runScenario(authorizedScenario);
const project = authResult.byName("website")!;
console.log("Project:", project.title, "- visibility:", project.visibility);

// ─── 8. Entry-level overrides via registry.run() ────────────────
//
// entry() gives per-item overrides when running individual prototypes
// directly, without a full scenario definition.

console.log("\n=== Ad-hoc run with entry() ===");
registry.resetSequences();
idCounter = 1;
const adHocResult = await registry.run([
  catalog.organizations.acme,
  entry(catalog.users.alice, { email: "alice+staging@acme.com" }),
]);
const aliceRecord = adHocResult.byName("alice")!;
console.log("Alice email:", aliceRecord.email);

// ─── 9. Seed helpers ───────────────────────────────────────────
//
// seed.func() wraps an async function as a named seeder.
// seed.chain() composes seeders — runs sequentially, stops on error.

const seedOrgs = seed.func("seed-organizations", async (ctx) => {
  console.log("  Seeding organizations...", ctx.runCtx ?? {});
});

const seedUsers = seed.func("seed-users", async () => {
  console.log("  Seeding users...");
});

const fullSeed = seed.chain(seedOrgs, seedUsers);
console.log("\n=== Seed chain:", fullSeed.name, "===");
await fullSeed.seed({ runCtx: { env: "staging" } });

// ─── 10. Testing helpers ────────────────────────────────────────
//
// testing.createMemoryRegistry() gives you a registry with
// deterministic create handlers — great for unit tests.

console.log("\n=== Testing helpers ===");
const testRegistry = testing.createMemoryRegistry(catalog);
const testResult = await testRegistry.runScenario(baseScenario);

testing.assertCreated(testResult, catalog.organizations.acme);
testing.assertAttr(testResult, catalog.organizations.acme, "slug", "acme");
testing.assertAttrNotEmpty(testResult, catalog.organizations.acme, "name");
console.log("All assertions passed.");
