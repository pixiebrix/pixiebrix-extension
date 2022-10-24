/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { blockConfigFactory, formStateFactory } from "@/testUtils/factories";
import VarAnalysis, { getVarsFromObject, VarExistence } from "./varAnalysis";
import { services } from "@/background/messenger/api";
import { validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";

jest.mock("@/background/messenger/api", () => ({
  __esModule: true,
  services: {
    locate: jest.fn(),
  },
}));

describe("getVarsFromObject", () => {
  test("gets all the root keys", () => {
    const obj = {
      foo: "bar",
      baz: "qux",
    };
    expect(getVarsFromObject(obj)).toEqual(["foo", "baz"]);
  });

  test("gets all the nested keys", () => {
    const obj = {
      foo: {
        bar: "baz",
      },
    };
    expect(getVarsFromObject(obj)).toEqual(["foo", "foo.bar"]);
  });
});

describe("VarAnalysis", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("gets the context vars", async () => {
    (services.locate as jest.Mock).mockResolvedValue({
      serviceId: "@test/service",
    });

    const extension = formStateFactory(
      {
        // Let this extension to have a service reference
        services: [
          {
            outputKey: validateOutputKey("pixiebrix"),
            id: validateRegistryId("@test/service"),
          },
        ],
        optionsArgs: {
          foo: "bar",
        },
      },
      [blockConfigFactory()]
    );

    const analysis = new VarAnalysis();
    await analysis.run(extension);

    expect(analysis.knownVars.size).toBe(1);
    expect([
      ...analysis.knownVars.get("extension.blockPipeline.0").keys(),
    ]).toEqual([
      "@pixiebrix",
      "@pixiebrix.__service",
      "@pixiebrix.__service.serviceId",
      "@input",
      "@input.icon",
      "@input.title",
      "@input.url",
      "@options",
      "@options.foo",
    ]);
    expect(
      [...analysis.knownVars.get("extension.blockPipeline.0").values()].every(
        (x) => x === VarExistence.DEFINITELY
      )
    ).toBeTrue();
  });
});
