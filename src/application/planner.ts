import type { CatalogShape, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
import { isPrototypeRef, toResultKey } from "../domain/refs.js";
import { isDepField, isDynamic } from "../domain/runtime-values.js";
import { DependencyCycleError } from "../domain/errors.js";
import type { PrototypeStorePort } from "../ports/prototype-store-port.js";

export function mergeInput(
  base: Readonly<Record<string, unknown>>,
  override: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...base, ...override };
}

export function orderRefs<Catalog extends CatalogShape>(
  store: PrototypeStorePort,
  requested: PrototypeRef[],
  overrides: ScenarioPrototypeMap<Catalog>,
): PrototypeRef[] {
  const ordered: PrototypeRef[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (ref: PrototypeRef): void => {
    const key = toResultKey(ref);
    if (visited.has(key)) {
      return;
    }

    if (visiting.has(key)) {
      const cycleStart = path.indexOf(key);
      const cycle = [...path.slice(cycleStart), key];
      throw new DependencyCycleError(cycle);
    }

    const handle = store.lookup(ref);

    visiting.add(key);
    path.push(key);

    const mergedInput = mergeInput(handle.input, overrides[ref.resource]?.[ref.prototype]);
    for (const dep of collectDependencies(mergedInput)) {
      visit(dep);
    }

    path.pop();
    visiting.delete(key);
    visited.add(key);
    ordered.push(ref);
  };

  for (const ref of requested) {
    visit(ref);
  }

  return ordered;
}

export function collectRequestedRefs<Catalog extends CatalogShape>(
  prototypes: ScenarioPrototypeMap<Catalog>,
): PrototypeRef[] {
  const refs: PrototypeRef[] = [];

  for (const resource of Object.keys(prototypes) as Array<keyof Catalog>) {
    const byName = prototypes[resource];
    if (!byName) {
      continue;
    }

    for (const name of Object.keys(byName)) {
      refs.push({
        $kind: "prototype-ref",
        resource: resource as unknown as PrototypeRef["resource"],
        prototype: name,
      });
    }
  }

  return refs;
}

function collectDependencies(value: unknown): PrototypeRef[] {
  const refs: PrototypeRef[] = [];
  collectDependenciesInto(value, refs);
  return refs;
}

function collectDependenciesInto(value: unknown, refs: PrototypeRef[]): void {
  if (isPrototypeRef(value)) {
    refs.push(value);
    return;
  }

  if (isDepField(value)) {
    refs.push(value.ref);
    return;
  }

  if (isDynamic(value)) {
    return; // dependencies resolved at runtime, not statically extractable
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectDependenciesInto(item, refs);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectDependenciesInto(child, refs);
    }
  }
}
