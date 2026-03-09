import type {
  CatalogShape,
  PrototypeCollection,
  PrototypeHandle,
  PrototypeRef,
  ResourceInput,
  ResourceKey,
} from "./types.js";

export function ref<
  R extends ResourceKey,
  N extends string,
>(resource: R, prototype: N): PrototypeRef<R, N> {
  return {
    $kind: "prototype-ref",
    resource,
    prototype,
  };
}

export function definePrototypes<
  R extends ResourceKey,
  const P extends Record<string, ResourceInput<R>>,
>(resource: R, prototypes: P): PrototypeCollection<R, P> {
  const entries = Object.entries(prototypes).map(([name, input]) => {
    const handle: PrototypeHandle<R, string> = {
      $kind: "prototype-handle",
      resource,
      name,
      input: Object.freeze({ ...(input as Record<string, unknown>) }) as Readonly<
        ResourceInput<R>
      >,
      ref: ref(resource, name),
    };

    return [name, handle] as const;
  });

  return Object.fromEntries(entries) as PrototypeCollection<R, P>;
}

export function defineCatalog<const C extends CatalogShape>(catalog: C): C {
  return catalog;
}

export function isPrototypeRef(value: unknown): value is PrototypeRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "$kind" in value &&
    (value as { $kind?: unknown }).$kind === "prototype-ref"
  );
}

export function toResultKey(target: PrototypeHandle | PrototypeRef): string {
  return `${target.resource}:${"prototype" in target ? target.prototype : target.name}`;
}
