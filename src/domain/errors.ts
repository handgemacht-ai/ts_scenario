export class UnknownResourceError extends Error {
  readonly resource: string;

  constructor(resource: string) {
    super(`Unknown resource: ${resource}`);
    this.name = "UnknownResourceError";
    this.resource = resource;
  }
}

export class UnknownPrototypeError extends Error {
  readonly resource: string;
  readonly prototype: string;

  constructor(resource: string, prototype: string) {
    super(`Unknown prototype ${prototype} for resource ${resource}`);
    this.name = "UnknownPrototypeError";
    this.resource = resource;
    this.prototype = prototype;
  }
}

export class DependencyCycleError extends Error {
  readonly cycle: string[];

  constructor(cycle: string[]) {
    super(`Dependency cycle detected: ${cycle.join(" -> ")}`);
    this.name = "DependencyCycleError";
    this.cycle = cycle;
  }
}

export class MissingDependencyResultError extends Error {
  readonly dependencyKey: string;

  constructor(dependencyKey: string) {
    super(`Missing dependency result for ${dependencyKey}`);
    this.name = "MissingDependencyResultError";
    this.dependencyKey = dependencyKey;
  }
}

export class MissingDependencyFieldError extends Error {
  readonly dependencyKey: string;
  readonly field: string;

  constructor(dependencyKey: string, field: string) {
    super(`Missing field ${field} on dependency ${dependencyKey}`);
    this.name = "MissingDependencyFieldError";
    this.dependencyKey = dependencyKey;
    this.field = field;
  }
}

export class DynamicEvaluationError extends Error {
  readonly resource: string;
  readonly prototype: string;
  readonly attr: string;

  constructor(resource: string, prototype: string, attr: string, cause: unknown) {
    super(`Dynamic evaluation failed for ${resource}.${prototype}.${attr}`, { cause });
    this.name = "DynamicEvaluationError";
    this.resource = resource;
    this.prototype = prototype;
    this.attr = attr;
  }
}

export class CreateFailureError extends Error {
  readonly resource: string;
  readonly prototype: string;

  constructor(resource: string, prototype: string, cause: unknown) {
    super(`Create failed for ${resource}:${prototype}`, { cause });
    this.name = "CreateFailureError";
    this.resource = resource;
    this.prototype = prototype;
  }
}
