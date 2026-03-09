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

- `types.ts` — `TsScenarioResources`, `ResourceKey`, `PrototypeRef`, `PrototypeHandle`, `CatalogShape`, `ScenarioPrototypeMap`, `RuntimeOverride`, `TaggedRuntimeValue`
- `refs.ts` — `ref()`, `definePrototypes()`, `defineCatalog()`, `isPrototypeRef()`, `toResultKey()`
- `scenario.ts` — `ScenarioDefinition`, `defineScenario()`, `materializeScenario()`, `mergeScenarioPrototypeMaps()`
- `results.ts` — `RunResult`, `ResultRecord`, `resolveField()`
- `runtime-values.ts` — `depField()`, `isDepField()`, `dynamic()`, `isDynamic()`, `DepFieldValue`, `DynamicValue`, `DynamicContext`
- `sequences.ts` — `AttrSequence` (per-attribute sequence counters)
- `errors.ts` — `UnknownResourceError`, `UnknownPrototypeError`, `DependencyCycleError`, `MissingDependencyResultError`, `MissingDependencyFieldError`, `DynamicEvaluationError`, `CreateFailureError`

### ports/

Abstract interfaces that define extension points:

- `PrototypeStorePort` — look up prototype handles by ref
- `CreatePort` — create a record from a `CreateContext`
- `SequencePort` — generate sequential IDs
- `ClockPort` — provide current time

### application/

Orchestration logic that composes domain and ports:

- `planner.ts` — topological sort of prototype refs (`orderRefs`, `collectRequestedRefs`), recognizes `depField` refs as dependencies, throws `DependencyCycleError`
- `executor.ts` — async serial execution loop (`execute`), resolves `ref`, `depField`, and `dynamic` tagged values, wraps failures in typed errors

### adapters/memory/

Default in-memory implementations of all ports:

- `MemoryPrototypeStore` — wraps a catalog for handle lookup
- `MemoryCreateAdapter` — delegates to user-supplied create handlers or generates default records, auto-populates `inserted_at`/`updated_at` via `ClockPort`
- `MemorySequenceAdapter` — generates `resource:prototype:N` IDs
- `MemoryClockAdapter` — returns `new Date()`

### public/

Composition root that wires adapters through the application layer:

- `prototypes.ts` — re-exports `ref`, `definePrototypes`, `defineCatalog`
- `scenarios.ts` — re-exports `defineScenario`, `materializeScenario`
- `registry.ts` — `createRegistry()` factory and `Registry` class (includes `resetSequences()`, `runCtx` support)
- `results.ts` — re-exports `RunResult`, `resolveField`

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
