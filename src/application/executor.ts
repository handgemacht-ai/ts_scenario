import type { CatalogShape, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import { isPrototypeRef } from "../domain/refs.js";
import { RunResult, type ResultRecord } from "../domain/results.js";
import { toResultKey } from "../domain/refs.js";
import type { PrototypeStorePort } from "../ports/prototype-store-port.js";
import type { CreatePort, RunMode } from "../ports/create-port.js";
import { orderRefs } from "./planner.js";

export async function execute<Catalog extends CatalogShape>(
  store: PrototypeStorePort,
  createPort: CreatePort,
  requested: PrototypeRef[],
  overrides: ScenarioPrototypeMap<Catalog>,
  mode: RunMode,
): Promise<RunResult<Catalog>> {
  const ordered = orderRefs(store, requested, overrides);
  const results = new RunResult<Catalog>();

  for (const ref of ordered) {
    const handle = store.lookup(ref);
    const mergedInput = mergeInput(handle.input, overrides[ref.resource]?.[ref.prototype]);
    const resolvedAttrs = resolveRuntimeValues(mergedInput, results, mode) as ResultRecord;
    const created = await createPort.create({
      resource: ref.resource,
      prototype: ref.prototype,
      mode,
      attrs: resolvedAttrs,
    });
    results.set(ref, created);
  }

  return results;
}

function mergeInput(
  base: Readonly<Record<string, unknown>>,
  override: Record<string, unknown> | undefined,
): ResultRecord {
  return {
    ...base,
    ...(override ?? {}),
  };
}

function resolveRuntimeValues<Catalog extends CatalogShape>(
  value: unknown,
  results: RunResult<Catalog>,
  mode: RunMode,
): unknown {
  if (isPrototypeRef(value)) {
    const record = results.get(value);
    if (!record) {
      throw new Error(`Missing dependency ${toResultKey(value)}`);
    }

    if (mode === "struct") {
      return record;
    }

    const id = record.id;
    if (id === undefined) {
      throw new Error(`Dependency ${toResultKey(value)} does not expose id`);
    }
    return id;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveRuntimeValues(item, results, mode));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(input).map(([key, child]) => [
        key,
        resolveRuntimeValues(child, results, mode),
      ]),
    );
  }

  return value;
}
