import type { CatalogShape, MetadataOptions, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import { isOverrideSpec, isPrototypeRef, toResultKey } from "../domain/refs.js";
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
import type { CreatePort, CreateContext, RunMode } from "../ports/create-port.js";
import { mergeInput, orderRefs } from "./planner.js";

interface ResolveContext {
  readonly results: RunResult<CatalogShape>;
  readonly mode: RunMode;
  readonly ref: PrototypeRef;
  readonly attrSequence: AttrSequence;
  readonly runCtx: Record<string, unknown>;
}

export interface ExecuteMetadata {
  readonly entryMetadata?: Record<string, MetadataOptions>;
}

export async function execute<Catalog extends CatalogShape>(
  store: PrototypeStorePort,
  createPort: CreatePort,
  requested: PrototypeRef[],
  overrides: ScenarioPrototypeMap<Catalog>,
  mode: RunMode,
  attrSequence?: AttrSequence,
  runCtx?: Record<string, unknown>,
  metadata?: ExecuteMetadata,
): Promise<RunResult<Catalog>> {
  const { cleanOverrides, overrideMeta } = extractOverrideMetadata(overrides);
  const ordered = orderRefs(store, requested, cleanOverrides, overrideMeta, metadata?.entryMetadata);
  const results = new RunResult<Catalog>();
  const ctx = runCtx ?? {};

  for (const ref of ordered) {
    const handle = store.lookup(ref);
    const key = toResultKey(ref);

    const rawOverride = cleanOverrides[ref.resource]?.[ref.prototype] as Record<string, unknown> | undefined;
    const mergedInput = mergeInput(handle.input, rawOverride);
    const rctx: ResolveContext = { results, mode, ref, attrSequence: attrSequence ?? new AttrSequence(), runCtx: ctx };
    const resolvedAttrs = await resolveRuntimeValues(mergedInput, rctx) as ResultRecord;

    const entryMeta = metadata?.entryMetadata?.[key];
    const ovrMeta = overrideMeta[key];
    const protoMeta = handle.metadata;
    const mergedMeta = mergeMetadata(protoMeta, ovrMeta, entryMeta);

    let actor: ResultRecord | undefined;
    if (mergedMeta.actor !== undefined) {
      if (isPrototypeRef(mergedMeta.actor)) {
        actor = results.get(mergedMeta.actor);
      } else {
        actor = mergedMeta.actor as ResultRecord;
      }
    }

    const authorize = mergedMeta.authorize !== undefined
      ? mergedMeta.authorize
      : actor !== undefined;

    let tenant: unknown;
    let finalAttrs = resolvedAttrs;
    if (mergedMeta.tenantFrom) {
      const tenantField = mergedMeta.tenantFrom;
      tenant = resolveField(resolvedAttrs, tenantField);

      if (mode === "persisted") {
        // Remove tenant attr from attrs in persisted mode
        const { [tenantField]: _, ...rest } = resolvedAttrs;
        finalAttrs = rest;
      }
    }

    const createFn = entryMeta?.create ?? ovrMeta?.create ?? protoMeta?.create;

    const createContext: CreateContext = {
      ref,
      resource: ref.resource,
      prototype: ref.prototype,
      mode,
      attrs: finalAttrs,
      runCtx: ctx,
      results,
      action: mergedMeta.action,
      actor,
      authorize,
      tenant,
      create: createFn,
    };

    let created: ResultRecord;
    try {
      created = await createPort.create(createContext);
    } catch (err) {
      if (err instanceof CreateFailureError) throw err;
      throw new CreateFailureError(ref.resource, ref.prototype, err);
    }

    results.set(ref, created);
  }

  return results;
}

function mergeMetadata(
  ...sources: (MetadataOptions | undefined)[]
): MetadataOptions {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result as MetadataOptions;
}

function extractOverrideMetadata<Catalog extends CatalogShape>(
  overrides: ScenarioPrototypeMap<Catalog>,
): {
  cleanOverrides: ScenarioPrototypeMap<Catalog>;
  overrideMeta: Record<string, MetadataOptions>;
} {
  const cleanOverrides: Record<string, Record<string, unknown>> = {};
  const overrideMeta: Record<string, MetadataOptions> = {};

  for (const resource of Object.keys(overrides)) {
    const byName = overrides[resource as keyof Catalog];
    if (!byName) continue;

    cleanOverrides[resource] = {};
    for (const [name, value] of Object.entries(byName as Record<string, unknown>)) {
      const key = `${resource}:${name}`;
      if (isOverrideSpec(value)) {
        cleanOverrides[resource][name] = value.attrs;
        overrideMeta[key] = value.options;
      } else {
        cleanOverrides[resource][name] = value;
      }
    }
  }

  return {
    cleanOverrides: cleanOverrides as ScenarioPrototypeMap<Catalog>,
    overrideMeta,
  };
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
