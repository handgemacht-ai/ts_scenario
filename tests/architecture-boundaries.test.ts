import { describe, expect, it } from "vitest";

describe("clean architecture module boundaries", () => {
  it("exports domain types from domain layer", async () => {
    const domain = await import("../src/domain/index.js");

    // Core domain types must be accessible from domain layer
    expect(domain.ref).toBeTypeOf("function");
    expect(domain.definePrototypes).toBeTypeOf("function");
    expect(domain.defineCatalog).toBeTypeOf("function");
    expect(domain.defineScenario).toBeTypeOf("function");
    expect(domain.materializeScenario).toBeTypeOf("function");
  });

  it("exports port interfaces from ports layer", async () => {
    const ports = await import("../src/ports/index.js");

    // Port contracts must be importable (they are types, but the module must exist)
    expect(ports).toBeDefined();
  });

  it("exports memory adapters from adapters layer", async () => {
    const adapters = await import("../src/adapters/index.js");

    // Memory adapters must be accessible
    expect(adapters).toBeDefined();
  });

  it("exports planner and executor from application layer", async () => {
    const application = await import("../src/application/index.js");

    // Application layer owns orchestration (planner + executor), not composition
    expect(application).toBeDefined();
  });

  it("exports composition root from public layer", async () => {
    const pub = await import("../src/public/index.js");

    // Public layer is the composition root: wires adapters + application
    expect(pub.ref).toBeTypeOf("function");
    expect(pub.definePrototypes).toBeTypeOf("function");
    expect(pub.defineCatalog).toBeTypeOf("function");
    expect(pub.defineScenario).toBeTypeOf("function");
    expect(pub.materializeScenario).toBeTypeOf("function");
    expect(pub.createRegistry).toBeTypeOf("function");
    expect(pub.RunResult).toBeTypeOf("function");
    expect(pub.resolveField).toBeTypeOf("function");
  });

  it("re-exports the full public API from the package root", async () => {
    const publicApi = await import("../src/index.js");

    // All public API symbols must remain accessible from root
    expect(publicApi.ref).toBeTypeOf("function");
    expect(publicApi.definePrototypes).toBeTypeOf("function");
    expect(publicApi.defineCatalog).toBeTypeOf("function");
    expect(publicApi.defineScenario).toBeTypeOf("function");
    expect(publicApi.materializeScenario).toBeTypeOf("function");
    expect(publicApi.createRegistry).toBeTypeOf("function");
    expect(publicApi.RunResult).toBeTypeOf("function");
    expect(publicApi.resolveField).toBeTypeOf("function");
  });
});
