import { readFile } from "node:fs/promises";
import { parseFixture } from "../application/fixture/index.js";
import { Fixture } from "../application/fixture/build-fixture.js";

export async function parseFixtureFile(path: string): Promise<Fixture> {
  const data = await readFile(path, "utf-8");
  const schema = parseFixture(data);
  return new Fixture(schema);
}
