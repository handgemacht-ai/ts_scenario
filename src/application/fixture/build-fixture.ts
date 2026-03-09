import type { PrototypeHandle, PrototypeRef } from "../../domain/types.js";
import type { DynamicValue } from "../../domain/runtime-values.js";
import type { FixtureCreateHandler, FixtureRegistryPort } from "../../ports/fixture-registry-port.js";
import { FIXTURE_REGISTRY } from "../../ports/fixture-registry-port.js";
import type { FixtureSchema } from "./schema.js";
import { dynamic } from "../../domain/runtime-values.js";
import {
  FixtureNotBuiltError,
  FixtureUnknownKeyError,
  FixtureUnboundDynamicError,
  FixtureParseError,
} from "../../domain/errors.js";
import { DYNAMIC_PLACEHOLDER, REF_PREFIX, parseFixtureKey } from "./schema.js";

export class Fixture {
  readonly #schema: FixtureSchema;
  readonly #dynamics = new Map<string, Map<string, DynamicValue["fn"]>>();
  readonly #createHandlers = new Map<string, FixtureCreateHandler>();
  readonly #handles = new Map<string, PrototypeHandle>();
  #compiled = false;
  #registered = false;

  constructor(schema: FixtureSchema) {
    this.#schema = schema;
  }

  ref(key: string): PrototypeRef {
    return parseFixtureKey(key);
  }

  instance(key: string): PrototypeHandle {
    if (!this.#compiled) {
      throw new FixtureNotBuiltError(key);
    }
    const handle = this.#handles.get(key);
    if (!handle) {
      throw new FixtureUnknownKeyError(key);
    }
    return handle;
  }

  addDynamic(protoRef: PrototypeRef, attr: string, fn: DynamicValue["fn"]): void {
    const key = `${protoRef.resource}:${protoRef.prototype}`;
    if (!this.#dynamics.has(key)) {
      this.#dynamics.set(key, new Map());
    }
    this.#dynamics.get(key)!.set(attr, fn);
  }

  addCreate(resource: string, fn: FixtureCreateHandler): void {
    this.#createHandlers.set(resource, fn);
  }

  compile(): void {
    if (this.#compiled) return;

    const allKeys = Object.keys(this.#schema.prototypes);
    const keySet = new Set(allKeys);

    for (const key of allKeys) {
      const proto = this.#schema.prototypes[key];
      const protoRef = parseFixtureKey(key);

      const compiledAttrs: Record<string, unknown> = {};

      for (const [attr, value] of Object.entries(proto.attrs)) {
        if (value === DYNAMIC_PLACEHOLDER) {
          const fn = this.#dynamics.get(key)?.get(attr);
          if (!fn) {
            throw new FixtureUnboundDynamicError(key, attr);
          }
          compiledAttrs[attr] = dynamic(fn);
        } else if (typeof value === "string" && value.startsWith(REF_PREFIX)) {
          const refKey = value.substring(REF_PREFIX.length);
          if (!keySet.has(refKey)) {
            throw new FixtureParseError(`attr "${attr}" references unknown prototype "${refKey}" (not found in fixture)`);
          }
          compiledAttrs[attr] = parseFixtureKey(refKey);
        } else {
          compiledAttrs[attr] = value;
        }
      }

      const handle: PrototypeHandle = {
        $kind: "prototype-handle",
        resource: protoRef.resource,
        name: protoRef.prototype,
        input: Object.freeze(compiledAttrs) as any,
        ref: protoRef,
        metadata: undefined,
      };

      this.#handles.set(key, handle);
    }

    this.#compiled = true;
  }

  build(registry: FixtureRegistryPort | { [FIXTURE_REGISTRY]: FixtureRegistryPort }): void {
    if (this.#registered) return;

    if (!this.#compiled) {
      this.compile();
    }

    const port = FIXTURE_REGISTRY in registry
      ? (registry as { [FIXTURE_REGISTRY]: FixtureRegistryPort })[FIXTURE_REGISTRY]
      : registry as FixtureRegistryPort;

    for (const handle of this.#handles.values()) {
      port.registerPrototype(handle);
    }

    for (const [resource, fn] of this.#createHandlers) {
      port.registerCreateHandler(resource, fn);
    }

    this.#registered = true;
  }

  get hasRuntimePlaceholders(): boolean {
    for (const proto of Object.values(this.#schema.prototypes)) {
      for (const value of Object.values(proto.attrs)) {
        if (value === DYNAMIC_PLACEHOLDER || (typeof value === "string" && value.startsWith(REF_PREFIX))) {
          return true;
        }
      }
    }
    return false;
  }
}
