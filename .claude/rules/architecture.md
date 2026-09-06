# ts_scenario Architecture

## Module Layers

```
src/
  domain/         Pure types, value objects, domain logic (no external deps)
  ports/          Abstract contracts (interfaces only)
  application/    Orchestration: planner + executor (imports domain + ports)
  adapters/       Port implementations (memory is default)
  public/         Composition root, user-facing API surface
  index.ts        Thin re-export of public/
```

## Import Rules

- `domain/` → imports nothing external
- `ports/` → imports only `domain/`
- `application/` → imports `domain/` and `ports/`, never `adapters/` or `public/`
- `adapters/` → imports `domain/` and `ports/`, never `application/` or `public/`
- `public/` → imports all layers (composition root)
- `index.ts` → re-exports from `public/` only

## Port Contracts

- `PrototypeStorePort` — look up prototype handles by ref
- `CreatePort` — create a record from a `CreateContext`
- `SequencePort` — generate sequential IDs
- `ClockPort` — provide current time (future use)

## Module Augmentation

Resource types are declared via `TsScenarioResources` in `src/domain/types.ts`.
Augmentation target: the published `./types` subpath (package.json exports `"./types"` → `./dist/domain/types.js`), so consumers augment `TsScenarioResources` from another repo:

```ts
declare module "ts_scenario/types" {
  // …add or override resource entries here
}
```
