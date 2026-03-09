import type { PrototypeRef } from "../domain/types.js";

export interface SequencePort {
  next(ref: PrototypeRef): string;
}
