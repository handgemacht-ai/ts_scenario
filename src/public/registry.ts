import type { CatalogShape, MetadataOptions, PrototypeHandle, PrototypeRef, ResourceKey, RunEntry, ScenarioPrototypeMap } from "../domain/types.js";
import type { ScenarioDefinition } from "../domain/scenario.js";
import { materializeScenario, mergeScenarioPrototypeMaps } from "../domain/scenario.js";
import { AttrSequence } from "../domain/sequences.js";
import { UnknownResourceError } from "../domain/errors.js";
import { isRunEntry, toResultKey } from "../domain/refs.js";
import type { RunMode } from "../ports/create-port.js";
import type { RunResult } from "../domain/results.js";
import { MemoryPrototypeStore } from "../adapters/memory/prototype-store.js";
import { MemoryCreateAdapter, type CreateHandlers } from "../adapters/memory/create-adapter.js";
import { MemorySequenceAdapter } from "../adapters/memory/sequence-adapter.js";
import { MemoryClockAdapter } from "../adapters/memory/clock-adapter.js";
import { execute, type ExecuteMetadata } from "../application/executor.js";
import { collectRequestedRefs } from "../application/planner.js";
import type { FixtureRegistryPort } from "../ports/fixture-registry-port.js";
import { FIXTURE_REGISTRY } from "../ports/fixture-registry-port.js";

export interface RunOptions<Catalog extends CatalogShape> {
  mode?: RunMode;
  overrides?: ScenarioPrototypeMap<Catalog>;
  runCtx?: Record<string, unknown>;
}

export function createRegistry<Catalog extends CatalogShape>(
  catalog: Catalog,
  options: {
    create?: CreateHandlers;
  } = {},
): Registry<Catalog> {
  return new Registry(catalog, options.create ?? {});
}

export class Registry<Catalog extends CatalogShape> {
  readonly #store: MemoryPrototypeStore<Catalog>;
  readonly #createAdapter: MemoryCreateAdapter;
  readonly #attrSequence: AttrSequence;
  readonly #catalog: Catalog;

  readonly [FIXTURE_REGISTRY]: FixtureRegistryPort;

  constructor(catalog: Catalog, createHandlers: CreateHandlers) {
    this.#catalog = catalog;
    this.#store = new MemoryPrototypeStore(catalog);
    const sequence = new MemorySequenceAdapter();
    const clock = new MemoryClockAdapter();
    this.#createAdapter = new MemoryCreateAdapter(createHandlers, sequence, clock);
    this.#attrSequence = new AttrSequence();

    this[FIXTURE_REGISTRY] = {
      registerPrototype: (handle) => this.#store.register(handle),
      registerCreateHandler: (resource, fn) => this.#createAdapter.registerHandler(resource, fn),
    };
  }

  resetSequences(): void {
    this.#attrSequence.reset();
  }

  async run(
    entries: Array<PrototypeHandle | PrototypeRef | RunEntry>,
    options: RunOptions<Catalog> = {},
  ): Promise<RunResult<Catalog>> {
    const requested: PrototypeRef[] = [];
    const entryOverrides: Record<string, Record<string, unknown>> = {};
    const entryMetadata: Record<string, MetadataOptions> = {};

    for (const item of entries) {
      if (isRunEntry(item)) {
        const ref = item.target;
        requested.push(ref);
        const key = toResultKey(ref);

        if (Object.keys(item.attrs).length > 0) {
          const resource = ref.resource;
          if (!entryOverrides[resource]) entryOverrides[resource] = {};
          entryOverrides[resource][ref.prototype] = item.attrs;
        }

        if (Object.keys(item.options).length > 0) {
          entryMetadata[key] = item.options;
        }
      } else {
        requested.push(item.$kind === "prototype-ref" ? item : item.ref);
      }
    }

    // Merge entry overrides with options.overrides (entry-level attrs take precedence)
    let overrides = options.overrides ?? {} as ScenarioPrototypeMap<Catalog>;
    if (Object.keys(entryOverrides).length > 0) {
      overrides = mergeScenarioPrototypeMaps(
        overrides,
        entryOverrides as ScenarioPrototypeMap<Catalog>,
      );
    }

    const metadata: ExecuteMetadata | undefined =
      Object.keys(entryMetadata).length > 0 ? { entryMetadata } : undefined;

    return execute(
      this.#store,
      this.#createAdapter,
      requested,
      overrides,
      options.mode ?? "persisted",
      this.#attrSequence,
      options.runCtx,
      metadata,
    );
  }

  async runScenario(
    scenario: ScenarioDefinition<Catalog, string>,
    options: RunOptions<Catalog> = {},
  ): Promise<RunResult<Catalog>> {
    const materialized = materializeScenario(scenario);
    const requested = collectRequestedRefs(materialized.prototypes);
    const overrides = mergeScenarioPrototypeMaps(
      materialized.prototypes,
      options.overrides ?? {},
    );

    return execute(
      this.#store,
      this.#createAdapter,
      requested,
      overrides,
      options.mode ?? "persisted",
      this.#attrSequence,
      options.runCtx,
    );
  }

  async runAll(
    resource: Extract<keyof Catalog, string>,
    options: RunOptions<Catalog> = {},
  ): Promise<RunResult<Catalog>> {
    const byResource = this.#catalog[resource];
    if (!byResource) {
      throw new UnknownResourceError(resource);
    }

    const refs: PrototypeRef[] = Object.keys(byResource).map((name) => ({
      $kind: "prototype-ref" as const,
      resource: resource as ResourceKey,
      prototype: name,
    }));

    return execute(
      this.#store,
      this.#createAdapter,
      refs,
      options.overrides ?? {} as ScenarioPrototypeMap<Catalog>,
      options.mode ?? "persisted",
      this.#attrSequence,
      options.runCtx,
    );
  }
}

