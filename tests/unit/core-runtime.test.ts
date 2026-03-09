import { describe, expect, it } from "vitest";

import {
  UnknownResourceError,
  UnknownPrototypeError,
  DependencyCycleError,
  MissingDependencyResultError,
  MissingDependencyFieldError,
  DynamicEvaluationError,
  CreateFailureError,
} from "../../src/domain/errors.js";
import { depField, isDepField, dynamic, isDynamic } from "../../src/domain/runtime-values.js";
import { AttrSequence } from "../../src/domain/sequences.js";
import { ref } from "../../src/domain/refs.js";

describe("typed error classes", () => {
  it("UnknownResourceError includes resource name", () => {
    const error = new UnknownResourceError("widgets");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnknownResourceError);
    expect(error.resource).toBe("widgets");
    expect(error.message).toContain("widgets");
    expect(error.name).toBe("UnknownResourceError");
  });

  it("UnknownPrototypeError includes resource and prototype", () => {
    const error = new UnknownPrototypeError("users", "ghost");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnknownPrototypeError);
    expect(error.resource).toBe("users");
    expect(error.prototype).toBe("ghost");
    expect(error.message).toContain("users");
    expect(error.message).toContain("ghost");
    expect(error.name).toBe("UnknownPrototypeError");
  });

  it("DependencyCycleError includes the cycle path", () => {
    const cycle = ["users:admin", "posts:draft", "users:admin"];
    const error = new DependencyCycleError(cycle);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DependencyCycleError);
    expect(error.cycle).toEqual(cycle);
    expect(error.message).toContain("users:admin");
    expect(error.message).toContain("posts:draft");
    expect(error.name).toBe("DependencyCycleError");
  });

  it("MissingDependencyResultError includes the dependency key", () => {
    const error = new MissingDependencyResultError("organizations:acme");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MissingDependencyResultError);
    expect(error.dependencyKey).toBe("organizations:acme");
    expect(error.message).toContain("organizations:acme");
    expect(error.name).toBe("MissingDependencyResultError");
  });

  it("MissingDependencyFieldError includes key and field", () => {
    const error = new MissingDependencyFieldError("users:admin", "email");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MissingDependencyFieldError);
    expect(error.dependencyKey).toBe("users:admin");
    expect(error.field).toBe("email");
    expect(error.message).toContain("users:admin");
    expect(error.message).toContain("email");
    expect(error.name).toBe("MissingDependencyFieldError");
  });

  it("DynamicEvaluationError wraps the original cause", () => {
    const cause = new TypeError("cannot read property x");
    const error = new DynamicEvaluationError("users", "admin", "slug", cause);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DynamicEvaluationError);
    expect(error.resource).toBe("users");
    expect(error.prototype).toBe("admin");
    expect(error.attr).toBe("slug");
    expect(error.cause).toBe(cause);
    expect(error.message).toContain("slug");
    expect(error.name).toBe("DynamicEvaluationError");
  });

  it("CreateFailureError wraps the original cause", () => {
    const cause = new Error("database connection lost");
    const error = new CreateFailureError("posts", "draft", cause);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CreateFailureError);
    expect(error.resource).toBe("posts");
    expect(error.prototype).toBe("draft");
    expect(error.cause).toBe(cause);
    expect(error.message).toContain("posts");
    expect(error.message).toContain("draft");
    expect(error.name).toBe("CreateFailureError");
  });
});

describe("depField tagged value", () => {
  it("creates a tagged dep-field value", () => {
    const orgRef = ref("organizations", "acme");
    const value = depField(orgRef, "slug");
    expect(value.$kind).toBe("dep-field");
    expect(value.ref).toBe(orgRef);
    expect(value.field).toBe("slug");
  });

  it("isDepField recognizes dep-field values", () => {
    const orgRef = ref("organizations", "acme");
    const value = depField(orgRef, "slug");
    expect(isDepField(value)).toBe(true);
  });

  it("isDepField rejects plain refs", () => {
    const orgRef = ref("organizations", "acme");
    expect(isDepField(orgRef)).toBe(false);
  });

  it("isDepField rejects plain objects", () => {
    expect(isDepField({ $kind: "something-else" })).toBe(false);
    expect(isDepField(null)).toBe(false);
    expect(isDepField("string")).toBe(false);
  });
});

describe("dynamic tagged value", () => {
  it("creates a tagged dynamic value", () => {
    const fn = ({ seqIndex }: { seqIndex: number }) => `slug-${seqIndex}`;
    const value = dynamic(fn);
    expect(value.$kind).toBe("dynamic-value");
    expect(value.fn).toBe(fn);
  });

  it("isDynamic recognizes dynamic values", () => {
    const value = dynamic(() => "test");
    expect(isDynamic(value)).toBe(true);
  });

  it("isDynamic rejects plain functions", () => {
    expect(isDynamic(() => "test")).toBe(false);
  });

  it("isDynamic rejects plain objects and refs", () => {
    expect(isDynamic({ $kind: "prototype-ref" })).toBe(false);
    expect(isDynamic(null)).toBe(false);
    expect(isDynamic(42)).toBe(false);
  });
});

describe("AttrSequence", () => {
  it("starts at 1 and increments per unique triple", () => {
    const seq = new AttrSequence();
    expect(seq.next("users", "admin", "email")).toBe(1);
    expect(seq.next("users", "admin", "email")).toBe(2);
    expect(seq.next("users", "admin", "email")).toBe(3);
  });

  it("isolates counters per (resource, prototype, attr) triple", () => {
    const seq = new AttrSequence();
    expect(seq.next("users", "admin", "email")).toBe(1);
    expect(seq.next("users", "admin", "name")).toBe(1);
    expect(seq.next("users", "viewer", "email")).toBe(1);
    expect(seq.next("posts", "admin", "email")).toBe(1);

    // Original counter should still be at 2
    expect(seq.next("users", "admin", "email")).toBe(2);
  });

  it("reset clears all counters", () => {
    const seq = new AttrSequence();
    seq.next("users", "admin", "email");
    seq.next("users", "admin", "email");
    expect(seq.next("users", "admin", "email")).toBe(3);

    seq.reset();

    expect(seq.next("users", "admin", "email")).toBe(1);
    expect(seq.next("users", "viewer", "name")).toBe(1);
  });
});
