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

import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import type { Mod } from "@/types/modTypes";
import { idHasScope, mapModComponentToUnavailableMod } from "@/utils/modUtils";
import { uniqBy } from "lodash";
import { type RegistryId } from "@/types/registryTypes";

// Note: Using regular function inputs here instead of an object for better
// ergonomics when using as the "result function" with reselect selectors.
export default function buildModsList(
  userScope: string,
  activatedModComponents: ActivatedModComponent[],
  allModDefinitions: ModDefinition[],
  activatedModIds: Set<RegistryId>,
): Mod[] {
  if (allModDefinitions.length === 0 && activatedModComponents.length === 0) {
    return [] as Mod[];
  }

  const knownPersonalOrTeamModDefinitions = allModDefinitions.filter(
    ({ metadata: { id }, sharing }) =>
      // Is personal mod
      idHasScope(id, userScope) ||
      // Is mod shared with the current user
      sharing.organizations.length > 0 ||
      // Is mod active, e.g. activated via marketplace
      activatedModIds.has(id),
  );

  const knownModIds = new Set(
    knownPersonalOrTeamModDefinitions.map(({ metadata }) => metadata.id),
  );

  // Find mod components that were activated by a mod definitions that's no longer available to the user, e.g.,
  // because it was deleted, or because the user no longer has access to it.
  const unavailableModComponents = activatedModComponents.filter(
    (modComponent) =>
      modComponent._recipe != null && !knownModIds.has(modComponent._recipe.id),
  );

  const unavailableMods = uniqBy(
    unavailableModComponents,
    ({ _recipe }) => _recipe?.id,
  ).map((modComponent) => mapModComponentToUnavailableMod(modComponent));

  return [...knownPersonalOrTeamModDefinitions, ...unavailableMods];
}
