/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import {
  getAllModComponentDefinitionsWithType,
  getContainedStarterBrickTypes,
  getModComponentIdsForModComponentDefinitions,
} from "@/starterBricks/starterBrickModUtils";
import {
  defaultModDefinitionFactory,
  modComponentDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import starterBrickRegistry from "@/starterBricks/registry";
import {
  type StarterBrick,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { activatedModComponentFactory } from "@/testUtils/factories/modComponentFactories";

starterBrickRegistry.lookup = jest.fn();

const starterBrickRegistryLookupMock = jest.mocked(starterBrickRegistry.lookup);

describe("starterBrickModUtils", () => {
  describe("getContainedStarterBrickTypes", () => {
    test("gets types with inner definitions", async () => {
      const result = await getContainedStarterBrickTypes(
        defaultModDefinitionFactory(),
      );
      expect(result).toStrictEqual([StarterBrickTypes.BUTTON]);
    });

    test("returns only unique types", async () => {
      const result = await getContainedStarterBrickTypes(
        defaultModDefinitionFactory({
          extensionPoints: [
            modComponentDefinitionFactory(),
            modComponentDefinitionFactory(),
          ],
        }),
      );
      expect(result).toStrictEqual([StarterBrickTypes.BUTTON]);
    });

    test("gets types without inner definitions", async () => {
      starterBrickRegistryLookupMock.mockResolvedValue({
        kind: StarterBrickTypes.BUTTON,
      } as StarterBrick);

      const result = await getContainedStarterBrickTypes(
        defaultModDefinitionFactory({
          extensionPoints: [modComponentDefinitionFactory()],
          definitions: undefined,
        }),
      );

      expect(result).toStrictEqual([StarterBrickTypes.BUTTON]);
    });

    test("returns non-null values", async () => {
      starterBrickRegistryLookupMock.mockResolvedValue(null);

      const result = await getContainedStarterBrickTypes(
        defaultModDefinitionFactory({
          extensionPoints: [modComponentDefinitionFactory()],
          definitions: undefined,
        }),
      );

      expect(result).toStrictEqual([]);
    });

    test("inner definition not found", async () => {
      starterBrickRegistryLookupMock.mockResolvedValue(null);

      const result = await getContainedStarterBrickTypes(
        defaultModDefinitionFactory({
          extensionPoints: [modComponentDefinitionFactory()],
          definitions: {},
        }),
      );

      expect(result).toStrictEqual([]);
    });
  });

  describe("getAllModComponenetDefinitionsWithType", () => {
    test("returns definitions with type", () => {
      const button = modComponentDefinitionFactory();

      const modDefinition = defaultModDefinitionFactory({
        extensionPoints: [button],
      });

      const result = getAllModComponentDefinitionsWithType(
        modDefinition,
        StarterBrickTypes.BUTTON,
      );

      expect(result).toStrictEqual([button]);
    });

    test("returns empty array if no definitions with type", () => {
      const menuItem = modComponentDefinitionFactory();

      const modDefinition = defaultModDefinitionFactory({
        extensionPoints: [menuItem],
      });

      const result = getAllModComponentDefinitionsWithType(
        modDefinition,
        StarterBrickTypes.SIDEBAR_PANEL,
      );

      expect(result).toStrictEqual([]);
    });
  });

  describe("getModComponentIdsForModComponentDefinitions", () => {
    test("returns activated mod component ids for mod component definitions", () => {
      const activatedModComponent = activatedModComponentFactory();
      const modComponentDefinition = modComponentDefinitionFactory({
        id: activatedModComponent.extensionPointId,
      });

      const result = getModComponentIdsForModComponentDefinitions(
        [activatedModComponent],
        [modComponentDefinition],
      );

      expect(result).toStrictEqual([activatedModComponent.id]);
    });

    test("ignores activatedModComponents that don't match modComponentDefinitions", () => {
      const activatedModComponent = activatedModComponentFactory();
      const modComponentDefinition = modComponentDefinitionFactory();

      const result = getModComponentIdsForModComponentDefinitions(
        [activatedModComponent],
        [modComponentDefinition],
      );

      expect(result).toStrictEqual([]);
    });

    test("handles multiple mod component definitions", () => {
      const activatedModComponent = activatedModComponentFactory();
      const modComponentDefinition = modComponentDefinitionFactory({
        id: activatedModComponent.extensionPointId,
      });

      const result = getModComponentIdsForModComponentDefinitions(
        [activatedModComponent],
        [modComponentDefinition, modComponentDefinitionFactory()],
      );

      expect(result).toStrictEqual([activatedModComponent.id]);
    });

    test("handles multiple mod component definitions and multiple activated mod components", () => {
      const activatedModComponent1 = activatedModComponentFactory();
      const modComponentDefinition1 = modComponentDefinitionFactory({
        id: activatedModComponent1.extensionPointId,
      });

      const activatedModComponent2 = activatedModComponentFactory();
      const modComponentDefinition2 = modComponentDefinitionFactory({
        id: activatedModComponent2.extensionPointId,
      });

      const result = getModComponentIdsForModComponentDefinitions(
        [
          activatedModComponent1,
          activatedModComponent2,
          activatedModComponentFactory(),
        ],
        [
          modComponentDefinition1,
          modComponentDefinitionFactory(),
          modComponentDefinition2,
        ],
      );

      expect(result).toStrictEqual([
        activatedModComponent1.id,
        activatedModComponent2.id,
      ]);
    });
  });
});
