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

import type { ModViewItem } from "@/types/modTypes";
import { useSelector } from "react-redux";
import { selectOrganizations } from "@/auth/authSelectors";
import { isModDefinition } from "@/utils/modUtils";
import { getScopeAndId } from "@/utils/registryUtils";
import { isPackageEditorRole } from "@/auth/authUtils";

/**
 * Return true if the item is a mod package and the user likely has permission to edit it.
 * - The package is owned by the user
 * - The package is owned by an organization the user that the user has editor permissions for
 *
 * The most accurate way to determine if the user has permission is to call getEditablePackages. However, the above
 * conditions should have the same behavior except for the following cases:
 * - Public mods without a scope defined
 * - Mods the user has edit permissions for because they're a deployment manager
 *
 * These limitations are acceptable compared to the cost of fetching metadata for all editable packages on the
 * mods screen to determine the permissions.
 *
 * @see isPackageEditorRole
 * @since 2.0.4
 */
function useHasModPackageEditPermission(modViewItem: ModViewItem): boolean {
  const { mod, sharing } = modViewItem;
  const organizations = useSelector(selectOrganizations);

  if (!isModDefinition(mod)) {
    return false;
  }

  if (sharing.source.type === "Personal") {
    return true;
  }

  return organizations.some((membership) => {
    const { scope: packageScope } = getScopeAndId(mod.metadata.id);
    return (
      isPackageEditorRole(membership.role) &&
      packageScope &&
      membership.scope === packageScope
    );
  });
}

export default useHasModPackageEditPermission;
