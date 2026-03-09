import type { CatalogShape, PrototypeHandle, PrototypeRef } from "./types.js";
import { toResultKey } from "./refs.js";

export type ResultRecord = Record<string, unknown>;

export class RunResult<Catalog extends CatalogShape> {
  readonly #records = new Map<string, ResultRecord>();
  readonly #names = new Map<string, string[]>();

  set(ref: PrototypeRef, record: ResultRecord): void {
    const key = toResultKey(ref);
    this.#records.set(key, record);

    const names = this.#names.get(ref.prototype) ?? [];
    names.push(key);
    this.#names.set(ref.prototype, names);
  }

  get(target: PrototypeHandle | PrototypeRef): ResultRecord | undefined {
    return this.#records.get(toResultKey(target));
  }

  mustGet(target: PrototypeHandle | PrototypeRef): ResultRecord {
    const record = this.get(target);
    if (!record) {
      throw new Error(`Missing record for ${toResultKey(target)}`);
    }
    return record;
  }

  byName(name: string): ResultRecord | undefined {
    const matches = this.#names.get(name) ?? [];
    if (matches.length > 1) {
      throw new Error(
        `Prototype name ${name} is ambiguous; use ref-based access instead`,
      );
    }

    const key = matches[0];
    return key ? this.#records.get(key) : undefined;
  }

  attr(target: PrototypeHandle | PrototypeRef | string, field: string): unknown {
    const record =
      typeof target === "string" ? this.byName(target) : this.get(target);

    if (!record) {
      return undefined;
    }

    return resolveField(record, field);
  }

  mustAttr(target: PrototypeHandle | PrototypeRef | string, field: string): unknown {
    const value = this.attr(target, field);
    if (value === undefined) {
      throw new Error(`Missing field ${field}`);
    }
    return value;
  }

  entries(): Array<[string, ResultRecord]> {
    return [...this.#records.entries()];
  }
}

export function resolveField(record: ResultRecord, field: string): unknown {
  if (field in record) {
    return record[field];
  }

  const camelField = toCamelCase(field);
  if (camelField in record) {
    return record[camelField];
  }

  const snakeField = toSnakeCase(field);
  if (snakeField in record) {
    return record[snakeField];
  }

  return undefined;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}
