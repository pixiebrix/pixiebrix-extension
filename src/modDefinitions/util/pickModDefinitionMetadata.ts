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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { pick } from "lodash";
import { isInternalRegistryId } from "@/utils/registryUtils";

/**
 * Select information about the ModDefinition used to activate an ModComponentBase
 *
 * If the mod definition was transformed from a standalone mod component definition, returns undefined.
 *
 * @see ModComponentBase._recipe
 */
export function pickModDefinitionMetadata(
  modDefinition: ModDefinition,
): ModComponentBase["_recipe"] {
  if (isInternalRegistryId(modDefinition.metadata.id)) {
    return undefined;
  }

  return {
    ...pick(modDefinition.metadata, ["id", "version", "name", "description"]),
    ...pick(modDefinition, ["sharing", "updated_at"]),
  };
}
