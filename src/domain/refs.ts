import type {
  CatalogShape,
  MetadataOptions,
  OverrideSpec,
  PrototypeCollection,
  PrototypeHandle,
  PrototypeRef,
  PrototypeSpec,
  ResourceInput,
  ResourceKey,
  RunEntry,
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

export function isPrototypeSpec(value: unknown): value is PrototypeSpec {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as PrototypeSpec).$kind === "prototype-spec"
  );
}

export function definePrototypes<
  R extends ResourceKey,
  const P extends Record<string, ResourceInput<R> | PrototypeSpec<ResourceInput<R>>>,
>(resource: R, prototypes: P): PrototypeCollection<R, P & Record<string, ResourceInput<R>>> {
  const entries = Object.entries(prototypes).map(([name, inputOrSpec]) => {
    const spec = isPrototypeSpec(inputOrSpec);
    const rawInput = spec ? inputOrSpec.attrs : inputOrSpec;
    const metadata: MetadataOptions | undefined = spec ? inputOrSpec.options : undefined;

    const handle: PrototypeHandle<R, string> = {
      $kind: "prototype-handle",
      resource,
      name,
      input: Object.freeze({ ...(rawInput as Record<string, unknown>) }) as Readonly<
        ResourceInput<R>
      >,
      ref: ref(resource, name),
      metadata,
    };

    return [name, handle] as const;
  });

  return Object.fromEntries(entries) as PrototypeCollection<R, P & Record<string, ResourceInput<R>>>;
}

export function defineCatalog<const C extends CatalogShape>(catalog: C): C {
  return catalog;
}

export function isPrototypeRef(value: unknown): value is PrototypeRef {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as PrototypeRef).$kind === "prototype-ref"
  );
}

export function isOverrideSpec(value: unknown): value is OverrideSpec {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as OverrideSpec).$kind === "override-spec"
  );
}

export function isRunEntry(value: unknown): value is RunEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as RunEntry).$kind === "run-entry"
  );
}

export function toResultKey(target: PrototypeHandle | PrototypeRef): string {
  const name = target.$kind === "prototype-ref" ? target.prototype : target.name;
  return `${target.resource}:${name}`;
}
