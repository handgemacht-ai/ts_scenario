import type { CatalogShape, PrototypeHandle, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import type { ScenarioDefinition } from "../domain/scenario.js";
import { materializeScenario, mergeScenarioPrototypeMaps } from "../domain/scenario.js";
import type { RunMode } from "../ports/create-port.js";
import type { ResultRecord } from "../domain/results.js";
import { RunResult } from "../domain/results.js";
import { MemoryPrototypeStore } from "../adapters/memory/prototype-store.js";
import { MemoryCreateAdapter, type CreateHandlers } from "../adapters/memory/create-adapter.js";
import { MemorySequenceAdapter } from "../adapters/memory/sequence-adapter.js";
import { execute } from "../application/executor.js";
import { collectRequestedRefs } from "../application/planner.js";

export interface RunOptions<Catalog extends CatalogShape> {
  mode?: RunMode;
  overrides?: ScenarioPrototypeMap<Catalog>;
}

export interface CreateContext {
  readonly resource: string;
  readonly prototype: string;
  readonly mode: RunMode;
  readonly attrs: ResultRecord;
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
  readonly #store: MemoryPrototypeStore<Catalog>;
  readonly #createAdapter: MemoryCreateAdapter<Catalog>;

  constructor(catalog: Catalog, createHandlers: CreateHandlers<Catalog>) {
    this.#store = new MemoryPrototypeStore(catalog);
    const sequence = new MemorySequenceAdapter();
    this.#createAdapter = new MemoryCreateAdapter(createHandlers, sequence);
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
    );
  }
}

function toPrototypeRef(target: PrototypeHandle | PrototypeRef): PrototypeRef {
  return "prototype" in target ? target : target.ref;
}
