# ts_scenario

Typed scenario/seed data builder: define resource prototypes, catalogs, and scenarios; run them against a handler (memory by default).

## Typed resources from a consuming package

Resources are typed by augmenting `TsScenarioResources`. From another repo, augment via the `./types` subpath (TS cannot augment a re-exported interface through the barrel):

```typescript
declare module "ts_scenario/types" {
  interface TsScenarioResources {
    widgets: {
      input: { name: string };
      record: { id: string; name: string };
    };
  }
}
```
