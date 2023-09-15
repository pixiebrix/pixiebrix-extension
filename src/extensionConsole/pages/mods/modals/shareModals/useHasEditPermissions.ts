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

import { selectAuth } from "@/auth/authSelectors";
import useSortOrganizations from "@/extensionConsole/pages/mods/modals/shareModals/useSortOrganizations";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import { UserRole } from "@/types/contract";
import { type RegistryId } from "@/types/registryTypes";
import { getScopeAndId } from "@/utils/registryUtils";
import { useSelector } from "react-redux";

const editorRoles = new Set<number>([UserRole.admin, UserRole.developer]);

export default function useHasEditPermissions(blueprintId: RegistryId) {
  const { scope: userScope } = useSelector(selectAuth);

  const { data: recipe } = useOptionalModDefinition(blueprintId);

  const sortedOrganizations = useSortOrganizations();
  const [recipeScope] = getScopeAndId(recipe?.metadata.id);

  let hasEditPermissions = false;

  if (recipeScope === userScope) {
    hasEditPermissions = true;
  } else {
    const ownerOrganization = sortedOrganizations.find(
      (x) => x.scope === recipeScope
    );

    if (ownerOrganization) {
      hasEditPermissions = editorRoles.has(ownerOrganization.role);
    }
  }

  return hasEditPermissions;
}
