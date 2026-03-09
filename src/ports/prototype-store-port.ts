import type { PrototypeHandle, PrototypeRef } from "../domain/types.js";

export interface PrototypeStorePort {
  lookup(ref: PrototypeRef): PrototypeHandle;
}
