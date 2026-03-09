export { defineCatalog, definePrototypes, ref, isPrototypeRef, isPrototypeSpec, isOverrideSpec, isRunEntry, toResultKey } from "../domain/refs.js";
export { RunResult, resolveField } from "../domain/results.js";
export { defineScenario, materializeScenario, mergeScenarioPrototypeMaps } from "../domain/scenario.js";
export { depField, isDepField, dynamic, isDynamic } from "../domain/runtime-values.js";
export { AttrSequence } from "../domain/sequences.js";
export {
  UnknownResourceError,
  UnknownPrototypeError,
  DependencyCycleError,
  MissingDependencyResultError,
  MissingDependencyFieldError,
  DynamicEvaluationError,
  CreateFailureError,
  ScenarioInheritanceCycleError,
  FixtureParseError,
  FixtureNotBuiltError,
  FixtureUnknownKeyError,
  FixtureUnboundDynamicError,
} from "../domain/errors.js";
export { prototype, override, entry } from "./wrappers.js";
export { createRegistry } from "./registry.js";
export { fixturegen } from "./fixturegen.js";
export { Fixture } from "../application/fixture/build-fixture.js";
export { seed } from "./seed.js";
export type { Seeder, SeederContext } from "./seed.js";
export { testing } from "./testing.js";
export type {
  CatalogShape,
  Link,
  MetadataOptions,
  OverrideSpec,
  PrototypeCollection,
  PrototypeHandle,
  PrototypeRef,
  PrototypeSpec,
  ResourceDefinition,
  ResourceInput,
  ResourceKey,
  ResourceRecord,
  RunEntry,
  ScenarioPrototypeMap,
  TsScenarioResources,
} from "../domain/types.js";
export type { DepFieldValue, DynamicValue, DynamicContext } from "../domain/runtime-values.js";
export type { ScenarioDefinition } from "../domain/scenario.js";
export type { ResultRecord } from "../domain/results.js";
export type { RunOptions } from "./registry.js";
export type { CreateContext, RunMode } from "../ports/create-port.js";
export type { CreateHandlers } from "../adapters/index.js";
export type { FixtureRegistryPort, FixtureCreateHandler } from "../ports/fixture-registry-port.js";
export type { FixtureSchema, FixturePrototype } from "../application/fixture/schema.js";
