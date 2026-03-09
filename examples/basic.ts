/**
 * Basic example — define resources, prototypes, a scenario, and run it.
 *
 * This shows the minimal setup: declare your resource types via module
 * augmentation, define prototypes with default attrs, compose a scenario,
 * and execute it through a registry with custom create handlers.
 */

import type { Link } from "../src/domain/types.js";
import {
  createRegistry,
  defineCatalog,
  definePrototypes,
  defineScenario,
  ref,
} from "../src/index.js";

// ─── 1. Declare resource types ─────────────────────────────────

declare module "../src/domain/types.js" {
  interface TsScenarioResources {
    teams: {
      input: { name: string; plan: "free" | "pro" };
      record: { id: string; name: string; plan: "free" | "pro" };
    };
    members: {
      input: { email: string; team_id: Link<"teams"> };
      record: { id: string; email: string; team_id: string };
    };
  }
}

// ─── 2. Define prototypes ───────────────────────────────────────

const teams = definePrototypes("teams", {
  starter: { name: "Starter Team", plan: "free" },
  enterprise: { name: "Enterprise Team", plan: "pro" },
});

const members = definePrototypes("members", {
  alice: { email: "alice@example.com", team_id: ref("teams", "starter") },
  bob: { email: "bob@example.com", team_id: ref("teams", "enterprise") },
});

const catalog = defineCatalog({ teams, members });

// ─── 3. Define a scenario ───────────────────────────────────────

const scenario = defineScenario(catalog, {
  name: "onboarding",
  prototypes: {
    teams: { starter: {} },
    members: {
      alice: { email: "alice+test@example.com" }, // override one attr
    },
  },
});

// ─── 4. Create a registry with create handlers ─────────────────

let nextId = 1;

const registry = createRegistry(catalog, {
  create: {
    teams: ({ attrs }) => ({ id: `team_${nextId++}`, ...attrs }),
    members: ({ attrs }) => ({ id: `member_${nextId++}`, ...attrs }),
  },
});

// ─── 5. Run the scenario ────────────────────────────────────────

const result = await registry.runScenario(scenario);

const alice = result.byName("alice")!;
console.log(alice);
// → { id: "member_2", email: "alice+test@example.com", team_id: "team_1" }

const starter = result.byName("starter")!;
console.log(starter);
// → { id: "team_1", name: "Starter Team", plan: "free" }
