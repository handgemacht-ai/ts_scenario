import { parseFixture } from "../application/fixture/index.js";
import { Fixture } from "../application/fixture/build-fixture.js";

export const fixturegen = {
  parse(input: string | object): Fixture {
    const schema = parseFixture(input);
    const fixture = new Fixture(schema);
    if (!fixture.hasRuntimePlaceholders) {
      fixture.compile();
    }
    return fixture;
  },
};

export { Fixture } from "../application/fixture/build-fixture.js";
