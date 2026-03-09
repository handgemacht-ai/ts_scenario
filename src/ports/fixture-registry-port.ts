import type { PrototypeHandle } from "../domain/types.js";
import type { CreateContext } from "./create-port.js";
import type { ResultRecord } from "../domain/results.js";

export type FixtureCreateHandler = (context: CreateContext) => ResultRecord | Promise<ResultRecord>;

export interface FixtureRegistryPort {
  registerPrototype(handle: PrototypeHandle): void;
  registerCreateHandler(resource: string, fn: FixtureCreateHandler): void;
}

export const FIXTURE_REGISTRY = Symbol.for("ts-scenario:fixture-registry");
