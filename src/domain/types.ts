export interface TsScenarioResources {}

export type ResourceKey = keyof TsScenarioResources & string;

export type ResourceDefinition<K extends ResourceKey> = TsScenarioResources[K];

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

export interface PrototypeHandle<
  R extends ResourceKey = ResourceKey,
  N extends string = string,
> {
  readonly $kind: "prototype-handle";
  readonly resource: R;
  readonly name: N;
  readonly input: Readonly<ResourceInput<R>>;
  readonly ref: PrototypeRef<R, N>;
}

export type PrototypeCollection<
  R extends ResourceKey,
  P extends Record<string, ResourceInput<R>>,
> = {
  readonly [K in keyof P]: PrototypeHandle<R, K & string>;
};

export type CatalogShape = Record<string, Record<string, PrototypeHandle<any, any>>>;

export type ScenarioPrototypeMap<Catalog extends CatalogShape> = {
  [Resource in keyof Catalog]?: {
    [Name in keyof Catalog[Resource]]?: Partial<
      ResourceInput<Extract<Resource, ResourceKey>>
    >;
  };
};
