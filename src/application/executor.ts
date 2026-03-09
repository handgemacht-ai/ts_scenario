import type { CatalogShape, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import { isPrototypeRef, toResultKey } from "../domain/refs.js";
import { RunResult, resolveField, type ResultRecord } from "../domain/results.js";
import { isDepField } from "../domain/runtime-values.js";
import { isDynamic } from "../domain/runtime-values.js";
import {
  MissingDependencyResultError,
  MissingDependencyFieldError,
  DynamicEvaluationError,
  CreateFailureError,
} from "../domain/errors.js";
import type { AttrSequence } from "../domain/sequences.js";
import type { PrototypeStorePort } from "../ports/prototype-store-port.js";
import type { CreatePort, RunMode } from "../ports/create-port.js";
import { mergeInput, orderRefs } from "./planner.js";

export async function execute<Catalog extends CatalogShape>(
  store: PrototypeStorePort,
  createPort: CreatePort,
  requested: PrototypeRef[],
  overrides: ScenarioPrototypeMap<Catalog>,
  mode: RunMode,
  attrSequence?: AttrSequence,
  runCtx?: Record<string, unknown>,
): Promise<RunResult<Catalog>> {
  const ordered = orderRefs(store, requested, overrides);
  const results = new RunResult<Catalog>();
  const ctx = runCtx ?? {};

  for (const ref of ordered) {
    const handle = store.lookup(ref);
    const mergedInput = mergeInput(handle.input, overrides[ref.resource]?.[ref.prototype]);
    const resolvedAttrs = await resolveRuntimeValues(mergedInput, results, mode, ref, attrSequence, ctx) as ResultRecord;

    let created: ResultRecord;
    try {
      created = await createPort.create({
        resource: ref.resource,
        prototype: ref.prototype,
        mode,
        attrs: resolvedAttrs,
      });
    } catch (err) {
      throw new CreateFailureError(ref.resource, ref.prototype, err);
    }

    results.set(ref, created);
  }

  return results;
}

async function resolveRuntimeValues<Catalog extends CatalogShape>(
  value: unknown,
  results: RunResult<Catalog>,
  mode: RunMode,
  currentRef: PrototypeRef,
  attrSequence?: AttrSequence,
  runCtx?: Record<string, unknown>,
  currentAttr?: string,
): Promise<unknown> {
  if (isPrototypeRef(value)) {
    const record = results.get(value);
    if (!record) {
      throw new MissingDependencyResultError(toResultKey(value));
    }

    if (mode === "struct") {
      return record;
    }

    const id = record.id;
    if (id === undefined) {
      throw new MissingDependencyFieldError(toResultKey(value), "id");
    }
    return id;
  }

  if (isDepField(value)) {
    const record = results.get(value.ref);
    if (!record) {
      throw new MissingDependencyResultError(toResultKey(value.ref));
    }

    const fieldValue = resolveField(record, value.field);
    if (fieldValue === undefined) {
      throw new MissingDependencyFieldError(toResultKey(value.ref), value.field);
    }
    return fieldValue;
  }

  if (isDynamic(value)) {
    const attr = currentAttr ?? "unknown";
    const seqIndex = attrSequence
      ? attrSequence.next(currentRef.resource, currentRef.prototype, attr)
      : 1;

    try {
      return await value.fn({
        ref: currentRef,
        attr,
        seqIndex,
        results: results as RunResult<CatalogShape>,
        runCtx: runCtx ?? {},
      });
    } catch (err) {
      throw new DynamicEvaluationError(currentRef.resource, currentRef.prototype, attr, err);
    }
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => resolveRuntimeValues(item, results, mode, currentRef, attrSequence, runCtx, currentAttr)),
    );
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const entries = await Promise.all(
      Object.entries(input).map(async ([key, child]) => [
        key,
        await resolveRuntimeValues(child, results, mode, currentRef, attrSequence, runCtx, key),
      ]),
    );
    return Object.fromEntries(entries);
  }

  return value;
}
