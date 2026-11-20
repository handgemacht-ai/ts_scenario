import type { CatalogShape, PrototypeHandle, PrototypeRef } from "../domain/types.js";
import type { CatalogTarget, ResultRecord, RunResult } from "../domain/results.js";
import { toResultKey } from "../domain/refs.js";
import type { CreateHandlers } from "../adapters/memory/create-adapter.js";
import { createRegistry, type Registry, type RunOptions } from "./registry.js";

function createMemoryRegistry<Catalog extends CatalogShape>(
  catalog: Catalog,
  handlers?: { create?: CreateHandlers },
): Registry<Catalog> {
  const create = handlers?.create ?? buildDefaultHandlers<Catalog>(catalog);
  const registry = createRegistry(catalog, { create });
  registry.resetSequences();
  return registry;
}

function buildDefaultHandlers<Catalog extends CatalogShape>(
  catalog: Catalog,
): CreateHandlers {
  const handlers: Record<string, unknown> = {};
  for (const resource of Object.keys(catalog)) {
    handlers[resource] = ({ attrs }: { attrs: ResultRecord }) => ({
      id: `${resource}:${Math.random().toString(36).slice(2, 10)}`,
      ...attrs,
    });
  }
  return handlers as CreateHandlers;
}

async function runOrThrow<Catalog extends CatalogShape>(
  registry: Registry<Catalog>,
  entries: Array<PrototypeHandle | PrototypeRef>,
  options?: RunOptions<Catalog>,
): Promise<RunResult<Catalog>> {
  try {
    return await registry.run(entries, options);
  } catch (err) {
    // Unwrap CreateFailureError to expose the original cause
    const rootCause = err instanceof Error && err.cause ? err.cause : err;
    throw new Error("runOrThrow failed", { cause: rootCause });
  }
}

function assertCreated<Catalog extends CatalogShape>(
  result: RunResult<Catalog>,
  target: CatalogTarget<Catalog>,
): void {
  if (!result.get(target)) {
    throw new Error(
      `Expected record "${toResultKey(target)}" to be created, but it was not found in results`,
    );
  }
}

function assertAttr<Catalog extends CatalogShape>(
  result: RunResult<Catalog>,
  target: CatalogTarget<Catalog>,
  attr: string,
  expected: unknown,
): void {
  if (!result.get(target)) {
    throw new Error(`Target not found in results`);
  }
  const actual = result.attr(target, attr);
  if (actual !== expected) {
    throw new Error(
      `Expected "${attr}" to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertAttrNotEmpty<Catalog extends CatalogShape>(
  result: RunResult<Catalog>,
  target: CatalogTarget<Catalog>,
  attr: string,
): void {
  if (!result.get(target)) {
    throw new Error(`Target not found in results`);
  }
  const value = result.attr(target, attr);
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Expected "${attr}" to be non-empty, got ${JSON.stringify(value)}`,
    );
  }
}

export const testing = {
  createMemoryRegistry,
  runOrThrow,
  assertCreated,
  assertAttr,
  assertAttrNotEmpty,
} as const;
