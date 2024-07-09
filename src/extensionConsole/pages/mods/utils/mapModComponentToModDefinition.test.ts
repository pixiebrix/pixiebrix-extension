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

import mapModComponentToModDefinition from "@/extensionConsole/pages/mods/utils/mapModComponentToModDefinition";
import { validateRegistryId } from "@/types/helpers";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import { DefinitionKinds } from "@/types/registryTypes";

describe("mapModComponentToModDefinition", () => {
  it("smoke test", () => {
    const result = mapModComponentToModDefinition(
      modComponentFactory() as SerializedModComponent,
      {
        id: validateRegistryId("test/blueprint"),
        name: "test",
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        kind: DefinitionKinds.MOD,
      }),
    );
  });

  it("infers mod options", () => {
    const modComponent = modComponentFactory({
      optionsArgs: {
        foo: "hello world!",
      },
    }) as SerializedModComponent;

    const result = mapModComponentToModDefinition(modComponent, {
      id: validateRegistryId("test/blueprint"),
      name: "test",
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: DefinitionKinds.MOD,
        options: {
          schema: {
            $schema: "http://json-schema.org/draft-04/schema#",
            properties: {
              foo: {
                type: "string",
              },
            },
            title: "Mod Options",
            type: "object",
          },
        },
      }),
    );
  });
});
