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

import { inferRecipeAuths, inferRecipeOptions } from "@/store/extensionsUtils";
import { ServiceDependency } from "@/core";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";

describe("inferRecipeOptions", () => {
  it("returns first option", () => {
    expect(inferRecipeOptions([{ optionsArgs: { foo: 42 } }])).toStrictEqual({
      foo: 42,
    });
  });

  it("return blank object if not set", () => {
    expect(inferRecipeOptions([{ optionsArgs: undefined }])).toStrictEqual({});
  });
});

describe("inferRecipeAuths", () => {
  it("handles undefined services", () => {
    expect(inferRecipeAuths([{ services: undefined }])).toStrictEqual({});
  });

  it("handles same service", () => {
    const service = validateRegistryId("foo/bar");
    const config = uuidv4();
    const dependency: ServiceDependency = {
      id: service,
      outputKey: validateOutputKey("foo"),
      config,
    };

    expect(
      inferRecipeAuths([{ services: [dependency] }, { services: [dependency] }])
    ).toStrictEqual({
      [service]: config,
    });
  });

  it("throw on mismatch", () => {
    const service = validateRegistryId("foo/bar");
    const config = uuidv4();
    const dependency: ServiceDependency = {
      id: service,
      outputKey: validateOutputKey("foo"),
      config,
    };

    expect(() =>
      inferRecipeAuths([
        { services: [dependency] },
        { services: [{ ...dependency, config: uuidv4() }] },
      ])
    ).toThrowError(/has multiple configurations/);
  });

  it("throw on missing config", () => {
    const service = validateRegistryId("foo/bar");
    const dependency: ServiceDependency = {
      id: service,
      outputKey: validateOutputKey("foo"),
    };

    expect(() => inferRecipeAuths([{ services: [dependency] }])).toThrowError(
      /is not configured/
    );
  });
});
