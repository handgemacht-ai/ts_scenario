import type { PrototypeRef, ResourceKey, ResolvedInput } from "../domain/types.js";
import type { ResultRecord, RunResult } from "../domain/results.js";
import type { CatalogShape } from "../domain/types.js";

export type RunMode = "persisted" | "struct";

export interface CreateContext {
  readonly ref: PrototypeRef;
  readonly resource: string;
  readonly prototype: string;
  readonly mode: RunMode;
  readonly attrs: ResultRecord;
  /** Alias for attrs — used by fixture create handlers */
  readonly input: ResultRecord;
  readonly runCtx: Record<string, unknown>;
  readonly results: RunResult<CatalogShape>;
  readonly action: string | undefined;
  readonly actor: ResultRecord | undefined;
  readonly authorize: boolean;
  readonly tenant: unknown;
  readonly create: ((context: CreateContext) => ResultRecord | Promise<ResultRecord>) | undefined;
}

export interface TypedCreateContext<R extends ResourceKey> {
  readonly ref: PrototypeRef;
  readonly resource: string;
  readonly prototype: string;
  readonly mode: RunMode;
  readonly attrs: ResolvedInput<R>;
  readonly input: ResolvedInput<R>;
  readonly runCtx: Record<string, unknown>;
  readonly results: RunResult<CatalogShape>;
  readonly action: string | undefined;
  readonly actor: ResultRecord | undefined;
  readonly authorize: boolean;
  readonly tenant: unknown;
  readonly create: ((context: CreateContext) => ResultRecord | Promise<ResultRecord>) | undefined;
}

export interface CreatePort {
  create(context: CreateContext): Promise<ResultRecord>;
}
