import type { CatalogShape, ResourceKey } from "../../domain/types.js";
import { ref } from "../../domain/refs.js";
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
    const protoRef = ref(context.resource as ResourceKey, context.prototype);

    // Create precedence: context.create (entry/override/prototype level) > resource handler > default
    const customCreate = context.create;
    const handler = this.#handlers[context.resource as Extract<keyof Catalog, string>];

    let record: ResultRecord;
    if (customCreate) {
      record = await customCreate(context);
    } else if (handler) {
      record = await handler(context);
    } else {
      record = { id: this.#sequence.next(protoRef), ...context.attrs };
    }

    if (resolveField(record, "id") === undefined) {
      record = {
        id: this.#sequence.next(protoRef),
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
