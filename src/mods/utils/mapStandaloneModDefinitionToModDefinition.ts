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

import type { StandaloneModDefinition } from "@/types/contract";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import mapModComponentToUnsavedModDefinition from "@/mods/utils/mapModComponentToUnsavedModDefinition";
import { getStandaloneModComponentRuntimeModId } from "@/utils/modUtils";
import { normalizeSemVerString } from "@/types/helpers";

/**
 * Map a standalone mod definition from the server to a mod definition
 * @see mapModComponentToUnsavedModDefinition
 * @see createModMetadataForStandaloneComponent - similar functionality
 */
export function mapStandaloneModDefinitionToModDefinition(
  standaloneModDefinition: StandaloneModDefinition,
): ModDefinition {
  const unsavedModDefinition = mapModComponentToUnsavedModDefinition(
    standaloneModDefinition,
    {
      id: getStandaloneModComponentRuntimeModId(standaloneModDefinition.id),
      name: standaloneModDefinition.label,
      version: normalizeSemVerString("1.0.0"),
      description: "Created in the Page Editor",
    },
  );

  return {
    ...unsavedModDefinition,
    updated_at: standaloneModDefinition.updateTimestamp,
    // Standalone mod components don't support sharing
    sharing: {
      organizations: [],
      public: false,
    },
  };
}
