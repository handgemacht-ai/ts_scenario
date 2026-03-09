# ts_scenario File Index

## Source Files

### domain/
- `src/domain/types.ts` — Core types: TsScenarioResources, ResourceKey, PrototypeRef, PrototypeHandle, CatalogShape, ScenarioPrototypeMap, RuntimeOverride, TaggedRuntimeValue, MetadataOptions, PrototypeSpec, OverrideSpec, RunEntry
- `src/domain/refs.ts` — ref(), definePrototypes(), defineCatalog(), isPrototypeRef(), isPrototypeSpec(), isOverrideSpec(), isRunEntry(), toResultKey()
- `src/domain/scenario.ts` — ScenarioDefinition, defineScenario(), materializeScenario()
- `src/domain/results.ts` — RunResult, ResultRecord, resolveField()
- `src/domain/runtime-values.ts` — depField(), isDepField(), dynamic(), isDynamic(), DepFieldValue, DynamicValue, DynamicContext
- `src/domain/sequences.ts` — AttrSequence (per-attribute sequence counters)
- `src/domain/errors.ts` — UnknownResourceError, UnknownPrototypeError, DependencyCycleError, MissingDependencyResultError, MissingDependencyFieldError, DynamicEvaluationError, CreateFailureError, ScenarioInheritanceCycleError, FixtureParseError, FixtureNotBuiltError, FixtureUnknownKeyError, FixtureUnboundDynamicError
- `src/domain/index.ts` — barrel export

### ports/
- `src/ports/prototype-store-port.ts` — PrototypeStorePort interface
- `src/ports/create-port.ts` — CreatePort, CreateContext, RunMode
- `src/ports/sequence-port.ts` — SequencePort interface
- `src/ports/clock-port.ts` — ClockPort interface
- `src/ports/fixture-registry-port.ts` — FixtureRegistryPort, FixtureCreateHandler, FIXTURE_REGISTRY symbol
- `src/ports/index.ts` — barrel export

### application/
- `src/application/planner.ts` — orderRefs(), collectRequestedRefs(), mergeInput()
- `src/application/executor.ts` — execute(), ExecuteMetadata, extractOverrideMetadata()
- `src/application/fixture/schema.ts` — FixtureSchema, FixturePrototype, parseFixture(), parseFixtureKey(), DYNAMIC_PLACEHOLDER, REF_PREFIX
- `src/application/fixture/build-fixture.ts` — Fixture class (ref, instance, addDynamic, addCreate, compile, build)
- `src/application/fixture/index.ts` — barrel export
- `src/application/index.ts` — barrel export

### adapters/memory/
- `src/adapters/memory/prototype-store.ts` — MemoryPrototypeStore
- `src/adapters/memory/create-adapter.ts` — MemoryCreateAdapter, CreateHandlers
- `src/adapters/memory/sequence-adapter.ts` — MemorySequenceAdapter
- `src/adapters/memory/clock-adapter.ts` — MemoryClockAdapter
- `src/adapters/memory/index.ts` — barrel export
- `src/adapters/index.ts` — barrel export

### public/
- `src/public/wrappers.ts` — prototype(), override(), entry() tagged wrappers
- `src/public/registry.ts` — createRegistry(), Registry class (run, runScenario, runAll, resetSequences), implements FixtureRegistryPort
- `src/public/fixturegen.ts` — fixturegen.parse() public API, Fixture re-export
- `src/public/index.ts` — barrel export (composition root)

### runtime/
- `src/runtime/node.ts` — parseFixtureFile(path) for Node.js (node:fs/promises)

### root
- `src/index.ts` — thin re-export of public/

## Test Files
- `tests/architecture-boundaries.test.ts` — module boundary imports
- `tests/port-contracts.test.ts` — port contract verification
- `tests/scenarios.test.ts` — prototype DX, materialization
- `tests/registry.test.ts` — scenario execution, modes, overrides
- `tests/scenario-types.ts` — type-level correctness checks
- `tests/unit/core-runtime.test.ts` — typed errors, depField, dynamic, AttrSequence unit tests
- `tests/unit/dynamic-values.test.ts` — depField/dynamic resolution, sequencing, cycle detection, timestamps integration tests
- `tests/unit/compatibility-wrappers.test.ts` — prototype(), override(), entry() wrapper tests
- `tests/unit/create-context-extended.test.ts` — extended CreateContext shape tests (ref, runCtx, results, action, actor, tenant)
- `tests/unit/create-precedence.test.ts` — create function precedence chain tests
- `tests/unit/run-all.test.ts` — registry.runAll() tests
- `tests/unit/scenario-runtime.test.ts` — actor resolution, authorize defaults, tenant extraction, inheritance cycles, multi-parent merge
- `tests/unit/fixturegen.test.ts` — JSON fixture compilation: parse, $ref, $dynamic, build idempotency, error cases, auto-build
- `tests/node/fixture-file.test.ts` — Node runtime parseFixtureFile tests
- `tests/fixtures/schema.ts` — TsScenarioResources augmentation
- `tests/fixtures/prototypes.ts` — test catalog and prototypes
- `tests/fixtures/fixture-samples.json` — sample JSON fixture file with $ref and $dynamic

## Documentation
- `docs/development.md` — development guide
