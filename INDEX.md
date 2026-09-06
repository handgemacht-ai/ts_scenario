---
type: index
last_verified: 2026-09-06
upstream_commit: 64be6f9
sources:
  - README.md
  - docs/development.md
  - AGENTS.md
---

# ts_scenario — index

Typed scenario/seed data builder: define resource prototypes, catalogs, and
scenarios; run them against a handler (memory by default). A TypeScript library
published under the `ts_scenario` package with `./seed`, `./testing`, `./types`,
and `./runtime/node` subpaths.

- [ts_scenario](README.md) — package overview and how a consuming repo types its
  resources via module augmentation against the `ts_scenario/types` subpath.
- [Development Guide](docs/development.md) — reference for the `src/` module
  structure (domain, ports, application, adapters, public, runtime), import
  dependency rules, module augmentation, and the test/typecheck commands.
- [Agent Instructions](AGENTS.md) — beads issue-tracking workflow, non-interactive
  shell command rules, and the session-completion ("Landing the Plane") checklist.
