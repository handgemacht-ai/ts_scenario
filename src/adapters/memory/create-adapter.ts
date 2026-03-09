import type { CatalogShape } from "../../domain/types.js";
import { resolveField, type ResultRecord } from "../../domain/results.js";
import type { CreateContext, CreatePort } from "../../ports/create-port.js";
import type { SequencePort } from "../../ports/sequence-port.js";
import type { ClockPort } from "../../ports/clock-port.js";

export type CreateHandlers<Catalog extends CatalogShape> = Partial<
  Record<Extract<keyof Catalog, string>, (context: CreateContext) => ResultRecord | Promise<ResultRecord>>
>;

export class MemoryCreateAdapter<Catalog extends CatalogShape> implements CreatePort {
  readonly #handlers: CreateHandlers<Catalog>;
  readonly #extraHandlers = new Map<string, (context: CreateContext) => ResultRecord | Promise<ResultRecord>>();
  readonly #sequence: SequencePort;
  readonly #clock: ClockPort;

  constructor(handlers: CreateHandlers<Catalog>, sequence: SequencePort, clock: ClockPort) {
    this.#handlers = handlers;
    this.#sequence = sequence;
    this.#clock = clock;
  }

  registerHandler(resource: string, fn: (context: CreateContext) => ResultRecord | Promise<ResultRecord>): void {
    this.#extraHandlers.set(resource, fn);
  }

  async create(context: CreateContext): Promise<ResultRecord> {
    const customCreate = context.create;
    const handler = this.#handlers[context.resource as Extract<keyof Catalog, string>];
    const extraHandler = this.#extraHandlers.get(context.resource);

    let record: ResultRecord;
    if (customCreate) {
      record = await customCreate(context);
    } else if (extraHandler) {
      record = await extraHandler(context);
    } else if (handler) {
      record = await handler(context);
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
