---
type: reference
summary: Typed scenario/seed data builder — define prototypes, catalogs, and scenarios run against a handler (memory by default).
owner: ts_scenario
status: current
tags: [testing]
last_verified: 2026-09-06
---

# ts_scenario

Typed scenario/seed data builder: define resource prototypes, catalogs, and scenarios; run them against a handler (memory by default).

## Public API / subpath exports

`package.json` `exports` publishes five subpaths. Each maps to a source entry point:

- `.` (main barrel) — `src/index.ts` re-exports `src/public/index.ts`, the composition root: `defineCatalog`, `definePrototypes`, `ref`, `createRegistry`, `fixturegen`, `Fixture`, `seed`, `testing`, plus all errors and types. This is what most consumers import.
- `./seed` — `src/public/seed.ts`: the `seed` builder (`seed.func`, `seed.chain`) and the `Seeder` / `SeederContext` types for composing idempotent seed routines.
- `./testing` — `src/public/testing.ts`: the `testing` API (`createMemoryRegistry`, `runOrThrow`, `assertCreated`, `assertAttr`, `assertAttrNotEmpty`) for in-memory test assertions.
- `./types` — `src/domain/types.ts`: the `TsScenarioResources` interface consumers augment to type their resources (see below).
- `./runtime/node` — `src/runtime/node.ts`: Node-only helpers `parseFixtureFile(path)` (reads JSON via `node:fs/promises` and builds a `Fixture`) and `sqlFile(path, execute)`. Must not be imported from browser-safe entries.

## Typed resources from a consuming package

Resources are typed by augmenting `TsScenarioResources`. From another repo, augment via the `./types` subpath (TS cannot augment a re-exported interface through the barrel):

```typescript
declare module "ts_scenario/types" {
  interface TsScenarioResources {
    widgets: {
      input: { name: string };
      record: { id: string; name: string };
    };
  }
}
```
