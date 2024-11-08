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

import type { AuthUserOrganization } from "@/auth/authTypes";
import type { Mod } from "../../../../types/modTypes";
import { idHasScope } from "../../../../utils/modUtils";
import { getScopeAndId } from "../../../../utils/registryUtils";
import { isPackageEditorRole } from "@/auth/authUtils";

export default function buildGetCanEditModScope(
  userScope: string,
  organizations: AuthUserOrganization[],
): (mod: Mod) => boolean {
  return (mod: Mod) => {
    // Can always edit mods with the user's scope
    if (idHasScope(mod.metadata.id, userScope)) {
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
  };
}
