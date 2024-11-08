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

import mapModDefinitionToModMetadata from "./mapModDefinitionToModMetadata";
import { modDefinitionFactory } from "../../testUtils/factories/modDefinitionFactories";

describe("mapModDefinitionToModMetadata", () => {
  it("picks metadata correctly for mod definition", () => {
    const modDefinition = modDefinitionFactory();

    expect(mapModDefinitionToModMetadata(modDefinition)).toEqual(
      expect.objectContaining({
        id: modDefinition.metadata.id,
        version: modDefinition.metadata.version,
        name: modDefinition.metadata.name,
        description: modDefinition.metadata.description,
        sharing: modDefinition.sharing,
        updated_at: modDefinition.updated_at,
      }),
    );
  });
});
