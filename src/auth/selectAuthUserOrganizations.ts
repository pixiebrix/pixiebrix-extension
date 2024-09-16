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

import { type AuthUserOrganization } from "@/auth/authTypes";
import { type Nullishable } from "@/utils/nullishUtils";
import { type MeOrganizationMembership } from "@/data/model/MeOrganizationMembership";
import { convertToUserRole } from "@/data/model/UserRole";

// Export this function because it's used in both the Extension and the App
export default function selectAuthUserOrganizations(
  organizationMemberships: Nullishable<MeOrganizationMembership[]>,
): AuthUserOrganization[] {
  if (organizationMemberships == null) {
    return [];
  }

  return organizationMemberships.map(
    ({
      organizationId,
      organizationName,
      organizationControlRoom,
      userOrganizationRole,
      organizationScope,
      meUserIsDeploymentManager,
    }) => ({
      id: organizationId,
      name: organizationName,
      control_room: organizationControlRoom,
      role: convertToUserRole(userOrganizationRole),
      scope: organizationScope,
      isDeploymentManager: meUserIsDeploymentManager,
    }),
  );
}
