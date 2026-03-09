import type { ResultRecord } from "../domain/results.js";

export type RunMode = "persisted" | "struct";

export interface CreateContext {
  readonly resource: string;
  readonly prototype: string;
  readonly mode: RunMode;
  readonly attrs: ResultRecord;
}

export interface CreatePort {
  create(context: CreateContext): Promise<ResultRecord>;
}
