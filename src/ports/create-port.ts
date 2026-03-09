import type { PrototypeRef } from "../domain/types.js";
import type { ResultRecord, RunResult } from "../domain/results.js";
import type { CatalogShape } from "../domain/types.js";

export type RunMode = "persisted" | "struct";

export interface CreateContext {
  readonly ref: PrototypeRef;
  readonly resource: string;
  readonly prototype: string;
  readonly mode: RunMode;
  readonly attrs: ResultRecord;
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
