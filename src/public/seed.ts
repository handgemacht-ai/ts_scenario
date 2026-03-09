export interface SeederContext {
  runCtx?: Record<string, unknown>;
}

export interface Seeder {
  readonly name: string;
  seed(ctx?: SeederContext): Promise<void>;
}

function func(
  name: string,
  fn: (ctx: SeederContext) => Promise<void> | void,
): Seeder {
  return {
    name,
    async seed(ctx: SeederContext = {}) {
      await fn(ctx);
    },
  };
}

function chain(...seeders: Seeder[]): Seeder {
  const name = `chain(${seeders.map((s) => s.name).join(",")})`;
  return {
    name,
    async seed(ctx: SeederContext = {}) {
      for (const seeder of seeders) {
        await seeder.seed(ctx);
      }
    },
  };
}

export const seed = { func, chain } as const;
