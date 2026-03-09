import type { CatalogShape, MetadataOptions, OverrideSpec, ScenarioPrototypeMap } from "./types.js";
import { ScenarioInheritanceCycleError } from "./errors.js";
import { isOverrideSpec } from "./refs.js";

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
  visited?: Set<string>,
  path?: string[],
): ScenarioDefinition<Catalog, string> {
  const seen = visited ?? new Set<string>();
  const chain = path ?? [];

  if (seen.has(scenario.name)) {
    const cycleStart = chain.indexOf(scenario.name);
    const cycle = [...chain.slice(cycleStart), scenario.name];
    throw new ScenarioInheritanceCycleError(cycle);
  }

  seen.add(scenario.name);
  chain.push(scenario.name);

  const mergedParents = scenario.extends.reduce<ScenarioPrototypeMap<Catalog>>(
    (acc, parent) =>
      mergeScenarioPrototypeMaps(acc, materializeScenario(parent, seen, chain).prototypes),
    {},
  );

  chain.pop();
  seen.delete(scenario.name);

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
          return [name, mergeOverrideValues(previous, override as Record<string, unknown>)];
        }),
      ),
    } as ScenarioPrototypeMap<Catalog>[typeof resource];
  }

  return merged;
}

function mergeOverrideValues(
  left: object,
  right: Record<string, unknown>,
): Record<string, unknown> | OverrideSpec {
  const leftIsSpec = isOverrideSpec(left);
  const rightIsSpec = isOverrideSpec(right);

  if (leftIsSpec && rightIsSpec) {
    return {
      $kind: "override-spec" as const,
      attrs: { ...left.attrs, ...right.attrs },
      options: mergeOptions(left.options, right.options),
    };
  }

  if (rightIsSpec) {
    return {
      $kind: "override-spec" as const,
      attrs: { ...(left as Record<string, unknown>), ...right.attrs },
      options: right.options,
    };
  }

  if (leftIsSpec) {
    return {
      $kind: "override-spec" as const,
      attrs: { ...left.attrs, ...right },
      options: left.options,
    };
  }

  return { ...(left as Record<string, unknown>), ...right };
}

function mergeOptions(
  left: MetadataOptions,
  right: MetadataOptions,
): MetadataOptions {
  const result: Record<string, unknown> = {};
  for (const source of [left, right]) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result as MetadataOptions;
}
