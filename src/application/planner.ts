import type { CatalogShape, MetadataOptions, PrototypeRef, ScenarioPrototypeMap } from "../domain/types.js";
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
  overrideMeta?: Record<string, MetadataOptions>,
): PrototypeRef[] {
  // First pass: collect all actor refs and ensure they are in the requested set.
  // Actor refs are NOT hard dependencies for ordering — they are resolved from
  // results at create time. But they must be auto-included in the graph so they
  // get created.
  const allRequested = [...requested];

  const ensureActorRefsIncluded = (refs: PrototypeRef[]): void => {
    for (const ref of refs) {
      const key = toResultKey(ref);
      const handle = store.lookup(ref);
      const protoActorRef = handle.metadata?.actor;
      const overrideActorRef = overrideMeta?.[key]?.actor;
      const actorRef = overrideActorRef ?? protoActorRef;
      if (actorRef && isPrototypeRef(actorRef)) {
        const actorKey = toResultKey(actorRef);
        if (!allRequested.some((r) => toResultKey(r) === actorKey)) {
          allRequested.push(actorRef);
          ensureActorRefsIncluded([actorRef]);
        }
      }
    }
  };
  ensureActorRefsIncluded(requested);

  // Second pass: topological sort based on attribute data dependencies only.
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

    const mergedInput = mergeInput(handle.input, overrides[ref.resource]?.[ref.prototype] as Record<string, unknown> | undefined);
    for (const dep of collectDependencies(mergedInput)) {
      visit(dep);
    }

    path.pop();
    visiting.delete(key);
    visited.add(key);
    ordered.push(ref);
  };

  for (const ref of allRequested) {
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
