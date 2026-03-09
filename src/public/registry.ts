import type { CatalogShape, PrototypeHandle, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import type { ScenarioDefinition } from "../domain/scenario.js";
import { materializeScenario, mergeScenarioPrototypeMaps } from "../domain/scenario.js";
import { AttrSequence } from "../domain/sequences.js";
import type { PrototypeStorePort } from "../ports/prototype-store-port.js";
import type { CreatePort, RunMode } from "../ports/create-port.js";
import { RunResult } from "../domain/results.js";
import { MemoryPrototypeStore } from "../adapters/memory/prototype-store.js";
import { MemoryCreateAdapter, type CreateHandlers } from "../adapters/memory/create-adapter.js";
import { MemorySequenceAdapter } from "../adapters/memory/sequence-adapter.js";
import { MemoryClockAdapter } from "../adapters/memory/clock-adapter.js";
import { execute } from "../application/executor.js";
import { collectRequestedRefs } from "../application/planner.js";

export interface RunOptions<Catalog extends CatalogShape> {
  mode?: RunMode;
  overrides?: ScenarioPrototypeMap<Catalog>;
  runCtx?: Record<string, unknown>;
}

export function createRegistry<Catalog extends CatalogShape>(
  catalog: Catalog,
  options: {
    create?: CreateHandlers<Catalog>;
  } = {},
): Registry<Catalog> {
  return new Registry(catalog, options.create ?? {});
}

export class Registry<Catalog extends CatalogShape> {
  readonly #store: PrototypeStorePort;
  readonly #createAdapter: CreatePort;
  readonly #attrSequence: AttrSequence;

  constructor(catalog: Catalog, createHandlers: CreateHandlers<Catalog>) {
    this.#store = new MemoryPrototypeStore(catalog);
    const sequence = new MemorySequenceAdapter();
    const clock = new MemoryClockAdapter();
    this.#createAdapter = new MemoryCreateAdapter(createHandlers, sequence, clock);
    this.#attrSequence = new AttrSequence();
  }

  resetSequences(): void {
    this.#attrSequence.reset();
  }

  async run(
    entries: Array<PrototypeHandle | PrototypeRef>,
    options: RunOptions<Catalog> = {},
  ): Promise<RunResult<Catalog>> {
    const requested = entries.map((entry) => toPrototypeRef(entry));
    return execute(
      this.#store,
      this.#createAdapter,
      requested,
      options.overrides ?? {},
      options.mode ?? "persisted",
      this.#attrSequence,
      options.runCtx,
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
}

function toPrototypeRef(target: PrototypeHandle | PrototypeRef): PrototypeRef {
  if (target.$kind === "prototype-ref") {
    return target;
  }
  return target.ref;
}
