export { defineCatalog, definePrototypes, ref, isPrototypeRef, toResultKey } from "../domain/refs.js";
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
} from "../domain/errors.js";
export { createRegistry } from "./registry.js";
export type {
  CatalogShape,
  Link,
  PrototypeCollection,
  PrototypeHandle,
  PrototypeRef,
  ResourceDefinition,
  ResourceInput,
  ResourceKey,
  ResourceRecord,
  ScenarioPrototypeMap,
  TsScenarioResources,
} from "../domain/types.js";
export type { DepFieldValue, DynamicValue, DynamicContext } from "../domain/runtime-values.js";
export type { ScenarioDefinition } from "../domain/scenario.js";
export type { ResultRecord } from "../domain/results.js";
export type { RunOptions } from "./registry.js";
export type { CreateContext, RunMode } from "../ports/create-port.js";
export type { CreateHandlers } from "../adapters/index.js";
