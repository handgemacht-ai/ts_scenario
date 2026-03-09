import type { CatalogShape, PrototypeHandle, PrototypeRef } from "../../domain/types.js";
import { UnknownResourceError, UnknownPrototypeError } from "../../domain/errors.js";
import type { PrototypeStorePort } from "../../ports/prototype-store-port.js";

export class MemoryPrototypeStore<Catalog extends CatalogShape> implements PrototypeStorePort {
  readonly #catalog: Catalog;

  constructor(catalog: Catalog) {
    this.#catalog = catalog;
  }

  lookup(ref: PrototypeRef): PrototypeHandle {
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
}
