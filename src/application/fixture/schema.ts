import type { PrototypeRef, ResourceKey } from "../../domain/types.js";
import { ref } from "../../domain/refs.js";
import { FixtureParseError } from "../../domain/errors.js";

export const DYNAMIC_PLACEHOLDER = "$dynamic";
export const REF_PREFIX = "$ref:";

export interface FixturePrototype {
  readonly attrs: Record<string, unknown>;
}

export interface FixtureSchema {
  readonly prototypes: Record<string, FixturePrototype>;
}

export function parseFixtureKey(key: string): PrototypeRef {
  const idx = key.indexOf(":");
  if (idx <= 0 || idx >= key.length - 1) {
    throw new FixtureParseError(`invalid key "${key}": expected "resource:prototype"`);
  }
  return ref(key.substring(0, idx) as ResourceKey, key.substring(idx + 1));
}

export function parseFixture(input: string | object): FixtureSchema {
  let parsed: unknown;

  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      throw new FixtureParseError("invalid JSON", err);
    }
  } else {
    parsed = input;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new FixtureParseError("expected an object");
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj.prototypes || typeof obj.prototypes !== "object") {
    throw new FixtureParseError("missing or invalid 'prototypes' key");
  }

  const prototypes: Record<string, FixturePrototype> = {};
  const raw = obj.prototypes as Record<string, unknown>;

  for (const [key, value] of Object.entries(raw)) {
    parseFixtureKey(key);

    if (!value || typeof value !== "object") {
      throw new FixtureParseError(`invalid prototype definition for "${key}"`);
    }

    const proto = value as Record<string, unknown>;
    const attrs = (proto.attrs && typeof proto.attrs === "object")
      ? proto.attrs as Record<string, unknown>
      : {};

    prototypes[key] = { attrs };
  }

  return { prototypes };
}
