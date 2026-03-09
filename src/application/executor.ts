import type { CatalogShape, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import { isPrototypeRef, toResultKey } from "../domain/refs.js";
import { RunResult, resolveField, type ResultRecord } from "../domain/results.js";
import { isDepField, isDynamic } from "../domain/runtime-values.js";
import {
  MissingDependencyResultError,
  MissingDependencyFieldError,
  DynamicEvaluationError,
  CreateFailureError,
} from "../domain/errors.js";
import { AttrSequence } from "../domain/sequences.js";
import type { PrototypeStorePort } from "../ports/prototype-store-port.js";
import type { CreatePort, RunMode } from "../ports/create-port.js";
import { mergeInput, orderRefs } from "./planner.js";

interface ResolveContext {
  readonly results: RunResult<CatalogShape>;
  readonly mode: RunMode;
  readonly ref: PrototypeRef;
  readonly attrSequence: AttrSequence;
  readonly runCtx: Record<string, unknown>;
}

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
    const rctx: ResolveContext = { results, mode, ref, attrSequence: attrSequence ?? new AttrSequence(), runCtx: ctx };
    const resolvedAttrs = await resolveRuntimeValues(mergedInput, rctx) as ResultRecord;

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

async function resolveRuntimeValues(
  value: unknown,
  ctx: ResolveContext,
  currentAttr?: string,
): Promise<unknown> {
  if (isPrototypeRef(value)) {
    const record = ctx.results.get(value);
    if (!record) {
      throw new MissingDependencyResultError(toResultKey(value));
    }

    if (ctx.mode === "struct") {
      return record;
    }

    const id = record.id;
    if (id === undefined) {
      throw new MissingDependencyFieldError(toResultKey(value), "id");
    }
    return id;
  }

  if (isDepField(value)) {
    const record = ctx.results.get(value.ref);
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
    const seqIndex = ctx.attrSequence.next(ctx.ref.resource, ctx.ref.prototype, attr);

    try {
      return await value.fn({
        ref: ctx.ref,
        attr,
        seqIndex,
        results: ctx.results,
        runCtx: ctx.runCtx,
      });
    } catch (err) {
      throw new DynamicEvaluationError(ctx.ref.resource, ctx.ref.prototype, attr, err);
    }
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => resolveRuntimeValues(item, ctx, currentAttr)),
    );
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const entries = await Promise.all(
      Object.entries(input).map(async ([key, child]) => [
        key,
        await resolveRuntimeValues(child, ctx, key),
      ]),
    );
    return Object.fromEntries(entries);
  }

  return value;
}
