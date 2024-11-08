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

import { type AuthUserOrganization } from "./authTypes";
import { type Nullishable } from "../utils/nullishUtils";
import { type MeTeamMembership } from "@/data/model/MeTeamMembership";
import { convertToUserRole } from "@/data/model/UserRole";

// Export this function because it's used in both the Extension and the App
export default function selectAuthUserOrganizations(
  teamMemberships: Nullishable<MeTeamMembership[]>,
): AuthUserOrganization[] {
  if (teamMemberships == null) {
    return [];
  }

  return teamMemberships.map(
    ({
      teamId: organizationId,
      teamName: organizationName,
      teamControlRoom: organizationControlRoom,
      userTeamRole: userOrganizationRole,
      teamScope: organizationScope,
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
