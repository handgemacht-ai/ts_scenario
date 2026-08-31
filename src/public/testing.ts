import type { CatalogShape, PrototypeHandle, PrototypeRef } from "../domain/types.js";
import type { ResultRecord, RunResult } from "../domain/results.js";
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

type Target = PrototypeHandle | PrototypeRef;

function assertCreated(
  result: RunResult<CatalogShape>,
  target: Target,
): void {
  const record = result.get(target);
  if (!record) {
    const key = "ref" in target ? `${target.resource}:${target.name}` : `${target.resource}:${target.prototype}`;
    throw new Error(`Expected record "${key}" to be created, but it was not found in results`);
  }
}

function assertAttr(
  result: RunResult<CatalogShape>,
  target: Target,
  attr: string,
  expected: unknown,
): void {
  const record = result.get(target);
  if (!record) {
    throw new Error(`Target not found in results`);
  }
  const actual = record[attr];
  if (actual !== expected) {
    throw new Error(
      `Expected "${attr}" to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertAttrNotEmpty(
  result: RunResult<CatalogShape>,
  target: Target,
  attr: string,
): void {
  const record = result.get(target);
  if (!record) {
    throw new Error(`Target not found in results`);
  }
  const value = record[attr];
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
