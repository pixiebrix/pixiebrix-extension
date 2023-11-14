/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { getContainedStarterBrickTypes } from "@/starterBricks/starterBrickModUtils";
import {
  defaultModDefinitionFactory,
  modComponentDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import extensionPointRegistry from "@/starterBricks/registry";
import { type StarterBrick } from "@/types/starterBrickTypes";

extensionPointRegistry.lookup = jest.fn();

const extensionPointRegistryLookupMock = jest.mocked(
  extensionPointRegistry.lookup
);

describe("getContainedStarterBrickTypes", () => {
  test("gets types with inner definitions", async () => {
    const result = await getContainedStarterBrickTypes(
      defaultModDefinitionFactory()
    );
    expect(result).toStrictEqual(["menuItem"]);
  });

  test("returns only unique types", async () => {
    const result = await getContainedStarterBrickTypes(
      defaultModDefinitionFactory({
        extensionPoints: [
          modComponentDefinitionFactory(),
          modComponentDefinitionFactory(),
        ],
      })
    );
    expect(result).toStrictEqual(["menuItem"]);
  });

  test("gets types without inner definitions", async () => {
    extensionPointRegistryLookupMock.mockResolvedValue({
      kind: "menuItem",
    } as StarterBrick);

    const result = await getContainedStarterBrickTypes(
      defaultModDefinitionFactory({
        extensionPoints: [modComponentDefinitionFactory()],
        definitions: undefined,
      })
    );

    expect(result).toStrictEqual(["menuItem"]);
  });

  test("returns non-null values", async () => {
    extensionPointRegistryLookupMock.mockResolvedValue(null);

    const result = await getContainedStarterBrickTypes(
      defaultModDefinitionFactory({
        extensionPoints: [modComponentDefinitionFactory()],
        definitions: undefined,
      })
    );

    expect(result).toStrictEqual([]);
  });

  test("inner definition not found", async () => {
    extensionPointRegistryLookupMock.mockResolvedValue(null);

    const result = await getContainedStarterBrickTypes(
      defaultModDefinitionFactory({
        extensionPoints: [modComponentDefinitionFactory()],
        definitions: {},
      })
    );

    expect(result).toStrictEqual([]);
  });
});
