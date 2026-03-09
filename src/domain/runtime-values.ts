import type { CatalogShape, PrototypeRef, ResourceKey } from "./types.js";
import type { RunResult } from "./results.js";

export type DepFieldValue<
  R extends ResourceKey = ResourceKey,
  N extends string = string,
> = {
  readonly $kind: "dep-field";
  readonly ref: PrototypeRef<R, N>;
  readonly field: string;
};

export function depField<R extends ResourceKey, N extends string>(
  ref: PrototypeRef<R, N>,
  field: string,
): DepFieldValue<R, N> {
  return { $kind: "dep-field", ref, field };
}

export function isDepField(value: unknown): value is DepFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as DepFieldValue).$kind === "dep-field"
  );
}

export interface DynamicContext {
  ref: PrototypeRef;
  attr: string;
  seqIndex: number;
  /** Alias for seqIndex — used by fixture dynamic bindings */
  seq: number;
  results: RunResult<CatalogShape>;
  runCtx: Record<string, unknown>;
}

export type DynamicValue = {
  readonly $kind: "dynamic-value";
  readonly fn: (ctx: DynamicContext) => unknown | Promise<unknown>;
};

export function dynamic(fn: DynamicValue["fn"]): DynamicValue {
  return { $kind: "dynamic-value", fn };
}

export function isDynamic(value: unknown): value is DynamicValue {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as DynamicValue).$kind === "dynamic-value"
  );
}
