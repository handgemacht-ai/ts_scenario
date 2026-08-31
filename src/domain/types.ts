export interface TsScenarioResources {}

export type ResourceKey = [keyof TsScenarioResources] extends [never]
  ? string
  : keyof TsScenarioResources & string;

export type ResourceDefinition<K extends ResourceKey> = [keyof TsScenarioResources] extends [never]
  ? { input: Record<string, unknown>; record: Record<string, unknown> }
  : TsScenarioResources[K & keyof TsScenarioResources];

export type ResourceInput<K extends ResourceKey> = ResourceDefinition<K> extends {
  input: infer Input;
}
  ? Input
  : never;

export type ResourceRecord<K extends ResourceKey> = ResourceDefinition<K> extends {
  record: infer RecordShape;
}
  ? RecordShape
  : never;

export type PrototypeRef<
  R extends ResourceKey = ResourceKey,
  N extends string = string,
> = {
  readonly $kind: "prototype-ref";
  readonly resource: R;
  readonly prototype: N;
};

export type Link<R extends ResourceKey> = PrototypeRef<R, string>;

/** The form of a resource input as a create handler sees it: every prototype-ref
 * (`Link`) field has already been resolved by the executor to the dependency
 * record's id, so those fields are typed `string` here; other fields pass through. */
export type ResolvedAttr<Input> = {
  [K in keyof Input]: Input[K] extends { $kind: "prototype-ref" } ? string : Input[K];
};

export type ResolvedInput<K extends ResourceKey> = ResolvedAttr<ResourceInput<K>>;

export interface PrototypeHandle<
  R extends ResourceKey = ResourceKey,
  N extends string = string,
> {
  readonly $kind: "prototype-handle";
  readonly resource: R;
  readonly name: N;
  readonly input: Readonly<ResourceInput<R>>;
  readonly ref: PrototypeRef<R, N>;
  readonly metadata?: MetadataOptions;
}

export type PrototypeCollection<
  R extends ResourceKey,
  P extends Record<string, ResourceInput<R>>,
> = {
  readonly [K in keyof P]: PrototypeHandle<R, K & string>;
};

export type CatalogShape = Record<string, Record<string, PrototypeHandle<any, any>>>;

export type RuntimeOverride<Input> = {
  [K in keyof Input]?: Input[K] | TaggedRuntimeValue;
};

export type TaggedRuntimeValue =
  | { readonly $kind: "dep-field" }
  | { readonly $kind: "dynamic-value" }
  | { readonly $kind: "prototype-ref" };

export type ScenarioPrototypeMap<Catalog extends CatalogShape> = {
  [Resource in keyof Catalog]?: {
    [Name in keyof Catalog[Resource]]?: RuntimeOverride<
      ResourceInput<Extract<Resource, ResourceKey>>
    > | OverrideSpec<ResourceInput<Extract<Resource, ResourceKey>>>;
  };
};

export interface MetadataOptions {
  readonly action?: string;
  readonly actor?: PrototypeRef | Record<string, unknown>;
  readonly authorize?: boolean;
  readonly tenantFrom?: string;
  readonly create?: (context: any) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

export interface PrototypeSpec<Input = Record<string, unknown>> {
  readonly $kind: "prototype-spec";
  readonly attrs: Input;
  readonly options: MetadataOptions;
}

export interface OverrideSpec<Input = Record<string, unknown>> {
  readonly $kind: "override-spec";
  readonly attrs: Partial<Input>;
  readonly options: MetadataOptions;
}

export interface RunEntry {
  readonly $kind: "run-entry";
  readonly target: PrototypeRef;
  readonly attrs: Record<string, unknown>;
  readonly options: MetadataOptions;
}
