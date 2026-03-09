# ts_scenario File Index

## Source Files

### domain/
- `src/domain/types.ts` — Core types: TsScenarioResources, ResourceKey, PrototypeRef, PrototypeHandle, CatalogShape, ScenarioPrototypeMap
- `src/domain/refs.ts` — ref(), definePrototypes(), defineCatalog(), isPrototypeRef(), toResultKey()
- `src/domain/scenario.ts` — ScenarioDefinition, defineScenario(), materializeScenario()
- `src/domain/results.ts` — RunResult, ResultRecord, resolveField()
- `src/domain/index.ts` — barrel export

### ports/
- `src/ports/prototype-store-port.ts` — PrototypeStorePort interface
- `src/ports/create-port.ts` — CreatePort, CreateContext, RunMode
- `src/ports/sequence-port.ts` — SequencePort interface
- `src/ports/clock-port.ts` — ClockPort interface
- `src/ports/index.ts` — barrel export

### application/
- `src/application/planner.ts` — orderRefs(), collectRequestedRefs(), mergeInput()
- `src/application/executor.ts` — execute()
- `src/application/index.ts` — barrel export

### adapters/memory/
- `src/adapters/memory/prototype-store.ts` — MemoryPrototypeStore
- `src/adapters/memory/create-adapter.ts` — MemoryCreateAdapter, CreateHandlers
- `src/adapters/memory/sequence-adapter.ts` — MemorySequenceAdapter
- `src/adapters/memory/clock-adapter.ts` — MemoryClockAdapter
- `src/adapters/memory/index.ts` — barrel export
- `src/adapters/index.ts` — barrel export

### public/
- `src/public/registry.ts` — createRegistry(), Registry class
- `src/public/index.ts` — barrel export (composition root)

### root
- `src/index.ts` — thin re-export of public/

## Test Files
- `tests/architecture-boundaries.test.ts` — module boundary imports
- `tests/port-contracts.test.ts` — port contract verification
- `tests/scenarios.test.ts` — prototype DX, materialization
- `tests/registry.test.ts` — scenario execution, modes, overrides
- `tests/scenario-types.ts` — type-level correctness checks
- `tests/fixtures/schema.ts` — TsScenarioResources augmentation
- `tests/fixtures/prototypes.ts` — test catalog and prototypes

## Documentation
- `docs/development.md` — development guide
