export { defineCatalog, definePrototypes, ref } from "../domain/refs.js";
export { RunResult, resolveField } from "../domain/results.js";
export { defineScenario, materializeScenario, mergeScenarioPrototypeMaps } from "../domain/scenario.js";
export { createRegistry } from "./registry.js";
export type {
  CatalogShape,
  Link,
  PrototypeCollection,
  PrototypeHandle,
  PrototypeRef,
  ResourceInput,
  ResourceKey,
  ResourceRecord,
  ScenarioPrototypeMap,
  TsScenarioResources,
} from "../domain/types.js";
export type { ScenarioDefinition } from "../domain/scenario.js";
export type { ResultRecord } from "../domain/results.js";
export type { RunOptions } from "./registry.js";
export type { CreateContext, RunMode } from "../ports/create-port.js";
export type { CreateHandlers } from "../adapters/memory/create-adapter.js";
