# ts_scenario Development Guide

## Module Structure

```
src/
  domain/         Pure types, value objects, domain logic
  ports/          Abstract contracts (interfaces only)
  application/    Orchestration: planner + executor
  adapters/       Port implementations (memory is the default)
  public/         Composition root, user-facing API surface
  index.ts        Thin re-export of public/
```

### domain/

Core types and logic with no external dependencies:

- `types.ts` — `TsScenarioResources`, `ResourceKey`, `PrototypeRef`, `PrototypeHandle`, `CatalogShape`, `ScenarioPrototypeMap`, `RuntimeOverride`, `TaggedRuntimeValue`, `MetadataOptions`, `PrototypeSpec`, `OverrideSpec`, `RunEntry`
- `refs.ts` — `ref()`, `definePrototypes()`, `defineCatalog()`, `isPrototypeRef()`, `toResultKey()`
- `scenario.ts` — `ScenarioDefinition`, `defineScenario()`, `materializeScenario()`, `mergeScenarioPrototypeMaps()` — includes inheritance cycle detection
- `results.ts` — `RunResult`, `ResultRecord`, `resolveField()`
- `runtime-values.ts` — `depField()`, `isDepField()`, `dynamic()`, `isDynamic()`, `DepFieldValue`, `DynamicValue`, `DynamicContext`
- `sequences.ts` — `AttrSequence` (per-attribute sequence counters)
- `errors.ts` — `UnknownResourceError`, `UnknownPrototypeError`, `DependencyCycleError`, `MissingDependencyResultError`, `MissingDependencyFieldError`, `DynamicEvaluationError`, `CreateFailureError`, `ScenarioInheritanceCycleError`, `FixtureParseError`, `FixtureNotBuiltError`, `FixtureUnknownKeyError`, `FixtureUnboundDynamicError`

### ports/

Abstract interfaces that define extension points:

- `PrototypeStorePort` — look up prototype handles by ref
- `CreatePort` — create a record from a `CreateContext` (extended with ref, runCtx, results, action, actor, authorize, tenant, create)
- `SequencePort` — generate sequential IDs
- `ClockPort` — provide current time
- `FixtureRegistryPort` — internal port for fixture-driven prototype registration (registerPrototype, registerCreateHandler)

### application/

Orchestration logic that composes domain and ports:

- `planner.ts` — topological sort of prototype refs (`orderRefs`, `collectRequestedRefs`), recognizes `depField` refs as dependencies, auto-includes actor refs in requested set, throws `DependencyCycleError`
- `executor.ts` — async serial execution loop (`execute`), resolves `ref`, `depField`, and `dynamic` tagged values, extracts override metadata from `OverrideSpec` wrappers, resolves actor/authorize/tenant, applies create precedence chain, wraps failures in typed errors
- `fixture/schema.ts` — JSON fixture schema types (`FixtureSchema`, `FixturePrototype`), `parseFixture()`, `parseFixtureKey()`, constants (`DYNAMIC_PLACEHOLDER`, `REF_PREFIX`)
- `fixture/build-fixture.ts` — `Fixture` class with `ref()`, `instance()`, `addDynamic()`, `addCreate()`, `compile()`, `build(registry)`
- `fixture/index.ts` — barrel export

### adapters/memory/

Default in-memory implementations of all ports:

- `MemoryPrototypeStore` — wraps a catalog for handle lookup, supports dynamic `register()` for fixture-added prototypes
- `MemoryCreateAdapter` — delegates to context-level create function, then resource-level create handler, or generates default records; auto-populates `inserted_at`/`updated_at` via `ClockPort`
- `MemorySequenceAdapter` — generates `resource:prototype:N` IDs
- `MemoryClockAdapter` — returns `new Date()`

### public/

Composition root that wires adapters through the application layer:

- `wrappers.ts` — `prototype()`, `override()`, `entry()` tagged wrappers for advanced metadata (actor, authorize, action, tenantFrom, create)
- `registry.ts` — `createRegistry()` factory and `Registry` class (includes `resetSequences()`, `runCtx` support, `runAll(resource)`), implements `FixtureRegistryPort` via `FIXTURE_REGISTRY` symbol
- `fixturegen.ts` — `fixturegen.parse()` public API for JSON fixture compilation
- `index.ts` — barrel export (composition root)

### runtime/

Runtime-specific entries for environment-dependent features:

- `node.ts` — `parseFixtureFile(path)` — reads a JSON fixture file via `node:fs/promises` and delegates to the same parser (must not be imported from browser-safe entries)

## Import Dependency Rules

| Layer       | May import from                        | Must NOT import from    |
|-------------|----------------------------------------|------------------------|
| domain      | (nothing external)                     | adapters, public       |
| ports       | domain                                 | adapters, public       |
| application | domain, ports                          | adapters, public       |
| adapters    | domain, ports                          | application, public    |
| public      | domain, ports, application, adapters   | —                      |

## Module Augmentation

User-defined resources are declared via TypeScript module augmentation on `TsScenarioResources` in `src/domain/types.ts`:

```typescript
declare module "ts_scenario/src/domain/types.js" {
  interface TsScenarioResources {
    users: {
      input: { name: string; role: string };
      record: { id: string; name: string; role: string };
    };
  }
}
```

## Running Tests and Typecheck

```bash
bun run test        # run all tests
bun run typecheck   # run TypeScript type checking
```
