import type { PrototypeHandle, PrototypeRef, ResourceKey } from "../../domain/types.js";
import type { DynamicValue } from "../../domain/runtime-values.js";
import type { CreateContext } from "../../ports/create-port.js";
import type { ResultRecord } from "../../domain/results.js";
import type { FixtureRegistryPort } from "../../ports/fixture-registry-port.js";
import { FIXTURE_REGISTRY } from "../../ports/fixture-registry-port.js";
import type { FixtureSchema } from "./schema.js";
import { ref } from "../../domain/refs.js";
import { dynamic } from "../../domain/runtime-values.js";
import {
  FixtureNotBuiltError,
  FixtureUnknownKeyError,
  FixtureUnboundDynamicError,
  FixtureParseError,
} from "../../domain/errors.js";
import { DYNAMIC_PLACEHOLDER, REF_PREFIX, parseFixtureKey } from "./schema.js";

type CreateHandler = (context: CreateContext) => ResultRecord | Promise<ResultRecord>;

export class Fixture {
  readonly #schema: FixtureSchema;
  readonly #dynamics = new Map<string, Map<string, DynamicValue["fn"]>>();
  readonly #createHandlers = new Map<string, CreateHandler>();
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
    let byAttr = this.#dynamics.get(key);
    if (!byAttr) {
      byAttr = new Map();
      this.#dynamics.set(key, byAttr);
    }
    byAttr.set(attr, fn);
  }

  addCreate(resource: string, fn: CreateHandler): void {
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
        if (typeof value === "string" && value === DYNAMIC_PLACEHOLDER) {
          const dynFns = this.#dynamics.get(key);
          const fn = dynFns?.get(attr);
          if (!fn) {
            throw new FixtureUnboundDynamicError(key, attr);
          }
          compiledAttrs[attr] = dynamic(fn);
        } else if (typeof value === "string" && value.startsWith(REF_PREFIX)) {
          const refKey = value.substring(REF_PREFIX.length);
          if (!keySet.has(refKey)) {
            throw new FixtureParseError(`attr "${attr}" references unknown prototype "${refKey}" (not found in fixture)`);
          }
          const depRef = parseFixtureKey(refKey);
          compiledAttrs[attr] = ref(depRef.resource as ResourceKey, depRef.prototype);
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
      const wrappedFn: CreateHandler = (ctx) => fn({ ...ctx, input: ctx.attrs } as any);
      port.registerCreateHandler(resource, wrappedFn);
    }

    this.#registered = true;
  }

  get hasDynamicPlaceholders(): boolean {
    for (const proto of Object.values(this.#schema.prototypes)) {
      for (const value of Object.values(proto.attrs)) {
        if (typeof value === "string" && value === DYNAMIC_PLACEHOLDER) {
          return true;
        }
      }
    }
    return false;
  }

  get hasRuntimePlaceholders(): boolean {
    for (const proto of Object.values(this.#schema.prototypes)) {
      for (const value of Object.values(proto.attrs)) {
        if (typeof value === "string" && (value === DYNAMIC_PLACEHOLDER || value.startsWith(REF_PREFIX))) {
          return true;
        }
      }
    }
    return false;
  }
}
