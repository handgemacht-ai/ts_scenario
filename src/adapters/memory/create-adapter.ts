import type { ResourceKey } from "../../domain/types.js";
import { resolveField, type ResultRecord } from "../../domain/results.js";
import type { CreateContext, CreatePort, TypedCreateContext } from "../../ports/create-port.js";
import type { SequencePort } from "../../ports/sequence-port.js";
import type { ClockPort } from "../../ports/clock-port.js";

export type CreateHandlers = {
  [R in Extract<ResourceKey, string>]?: (
    context: TypedCreateContext<R>,
  ) => ResultRecord | Promise<ResultRecord>;
};

export class MemoryCreateAdapter implements CreatePort {
  readonly #handlers: CreateHandlers;
  readonly #extraHandlers = new Map<string, (context: CreateContext) => ResultRecord | Promise<ResultRecord>>();
  readonly #sequence: SequencePort;
  readonly #clock: ClockPort;

  constructor(handlers: CreateHandlers, sequence: SequencePort, clock: ClockPort) {
    this.#handlers = handlers;
    this.#sequence = sequence;
    this.#clock = clock;
  }

  registerHandler(resource: string, fn: (context: CreateContext) => ResultRecord | Promise<ResultRecord>): void {
    this.#extraHandlers.set(resource, fn);
  }

  async create(context: CreateContext): Promise<ResultRecord> {
    const customCreate = context.create;
    const handler = this.#handlers[context.resource as Extract<ResourceKey, string>];
    const extraHandler = this.#extraHandlers.get(context.resource);

    let record: ResultRecord;
    if (customCreate) {
      record = await customCreate(context);
    } else if (extraHandler) {
      record = await extraHandler(context);
    } else if (handler) {
      record = await (handler as (c: CreateContext) => ResultRecord | Promise<ResultRecord>)(context);
    } else {
      record = { id: this.#sequence.next(context.ref), ...context.attrs };
    }

    if (resolveField(record, "id") === undefined) {
      record = {
        id: this.#sequence.next(context.ref),
        ...record,
      };
    }

    const now = this.#clock.now();

    if (resolveField(record, "inserted_at") === undefined) {
      record = { ...record, inserted_at: now };
    }

    if (resolveField(record, "updated_at") === undefined) {
      record = { ...record, updated_at: now };
    }

    return record;
  }
}
