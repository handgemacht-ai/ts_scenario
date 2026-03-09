import type { CatalogShape, PrototypeHandle, PrototypeRef } from "../../domain/types.js";
import { UnknownResourceError, UnknownPrototypeError } from "../../domain/errors.js";
import type { PrototypeStorePort } from "../../ports/prototype-store-port.js";

export class MemoryPrototypeStore<Catalog extends CatalogShape> implements PrototypeStorePort {
  readonly #catalog: Catalog;
  readonly #extra = new Map<string, PrototypeHandle>();

  constructor(catalog: Catalog) {
    this.#catalog = catalog;
  }

  lookup(ref: PrototypeRef): PrototypeHandle {
    const extraKey = `${ref.resource}:${ref.prototype}`;
    const extra = this.#extra.get(extraKey);
    if (extra) return extra;

    const byResource = this.#catalog[ref.resource];
    if (!byResource) {
      throw new UnknownResourceError(ref.resource);
    }

    const handle = byResource[ref.prototype as keyof typeof byResource];
    if (!handle) {
      throw new UnknownPrototypeError(ref.resource, ref.prototype);
    }

    return handle;
  }

  register(handle: PrototypeHandle): void {
    const key = `${handle.resource}:${handle.name}`;
    this.#extra.set(key, handle);
  }
}
