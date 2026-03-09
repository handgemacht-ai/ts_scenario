export class AttrSequence {
  readonly #counters = new Map<string, number>();

  next(resource: string, prototype: string, attr: string): number {
    const key = `${resource}:${prototype}:${attr}`;
    const current = this.#counters.get(key) ?? 0;
    const next = current + 1;
    this.#counters.set(key, next);
    return next;
  }

  reset(): void {
    this.#counters.clear();
  }
}
