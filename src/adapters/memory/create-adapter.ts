import type { CatalogShape, PrototypeRef } from "../../domain/types.js";
import { resolveField, type ResultRecord } from "../../domain/results.js";
import type { CreateContext, CreatePort } from "../../ports/create-port.js";
import type { SequencePort } from "../../ports/sequence-port.js";
import type { ClockPort } from "../../ports/clock-port.js";

export type CreateHandlers<Catalog extends CatalogShape> = Partial<
  Record<Extract<keyof Catalog, string>, (context: CreateContext) => ResultRecord | Promise<ResultRecord>>
>;

export class MemoryCreateAdapter<Catalog extends CatalogShape> implements CreatePort {
  readonly #handlers: CreateHandlers<Catalog>;
  readonly #sequence: SequencePort;
  readonly #clock: ClockPort;

  constructor(handlers: CreateHandlers<Catalog>, sequence: SequencePort, clock: ClockPort) {
    this.#handlers = handlers;
    this.#sequence = sequence;
    this.#clock = clock;
  }

  async create(context: CreateContext): Promise<ResultRecord> {
    const handler = this.#handlers[context.resource as Extract<keyof Catalog, string>];
    const contextRef = toRef(context);

    let record = handler
      ? await handler(context)
      : { id: this.#sequence.next(contextRef), ...context.attrs };

    if (resolveField(record, "id") === undefined) {
      record = {
        id: this.#sequence.next(contextRef),
        ...record,
      };
    }

    if (resolveField(record, "inserted_at") === undefined) {
      record = { ...record, inserted_at: this.#clock.now() };
    }

    if (resolveField(record, "updated_at") === undefined) {
      record = { ...record, updated_at: this.#clock.now() };
    }

    return record;
  }
}

function toRef(context: CreateContext): PrototypeRef {
  return {
    $kind: "prototype-ref",
    resource: context.resource as PrototypeRef["resource"],
    prototype: context.prototype,
  };
}
