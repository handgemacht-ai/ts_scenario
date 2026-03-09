import type { PrototypeRef } from "../../domain/types.js";
import type { SequencePort } from "../../ports/sequence-port.js";

export class MemorySequenceAdapter implements SequencePort {
  #counter = 0;

  next(ref: PrototypeRef): string {
    return `${ref.resource}:${ref.prototype}:${++this.#counter}`;
  }
}
