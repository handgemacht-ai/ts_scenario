import type { CatalogShape, ScenarioPrototypeMap } from "./types.js";

export interface ScenarioDefinition<
  Catalog extends CatalogShape,
  Name extends string = string,
> {
  readonly $kind: "scenario-definition";
  readonly name: Name;
  readonly catalog: Catalog;
  readonly extends: readonly ScenarioDefinition<Catalog, string>[];
  readonly prototypes: ScenarioPrototypeMap<Catalog>;
}

export function defineScenario<
  Catalog extends CatalogShape,
  Name extends string,
>(
  catalog: Catalog,
  config: {
    name: Name;
    extends?:
      | ScenarioDefinition<Catalog, string>
      | readonly ScenarioDefinition<Catalog, string>[];
    prototypes?: ScenarioPrototypeMap<Catalog>;
  },
): ScenarioDefinition<Catalog, Name> {
  return {
    $kind: "scenario-definition",
    name: config.name,
    catalog,
    extends: normalizeExtends(config.extends),
    prototypes: config.prototypes ?? {},
  };
}

export function materializeScenario<Catalog extends CatalogShape>(
  scenario: ScenarioDefinition<Catalog, string>,
): ScenarioDefinition<Catalog, string> {
  const mergedParents = scenario.extends.reduce<ScenarioPrototypeMap<Catalog>>(
    (acc, parent) =>
      mergeScenarioPrototypeMaps(acc, materializeScenario(parent).prototypes),
    {},
  );

  return {
    ...scenario,
    prototypes: mergeScenarioPrototypeMaps(mergedParents, scenario.prototypes),
  };
}

function normalizeExtends<Catalog extends CatalogShape>(
  value:
    | ScenarioDefinition<Catalog, string>
    | readonly ScenarioDefinition<Catalog, string>[]
    | undefined,
): readonly ScenarioDefinition<Catalog, string>[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value as ScenarioDefinition<Catalog, string>];
}

export function mergeScenarioPrototypeMaps<Catalog extends CatalogShape>(
  left: ScenarioPrototypeMap<Catalog>,
  right: ScenarioPrototypeMap<Catalog>,
): ScenarioPrototypeMap<Catalog> {
  const merged: ScenarioPrototypeMap<Catalog> = { ...left };

  for (const resource of Object.keys(right) as Array<keyof Catalog>) {
    const leftResource = merged[resource] ?? {};
    const rightResource = right[resource] ?? {};

    merged[resource] = {
      ...leftResource,
      ...Object.fromEntries(
        Object.entries(rightResource).map(([name, override]) => {
          const previous = (leftResource as Record<string, object | undefined>)[name] ?? {};
          return [name, { ...previous, ...(override as Record<string, unknown>) }];
        }),
      ),
    } as ScenarioPrototypeMap<Catalog>[typeof resource];
  }

  return merged;
}
