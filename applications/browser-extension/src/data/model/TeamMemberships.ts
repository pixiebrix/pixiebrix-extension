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

import {
  type TeamMembershipGroup,
  transformTeamMemberGroupsResponse,
} from "@/data/model/TeamMembershipGroups";
import {
  transformTeamMemberUserResponse,
  type TeamMembershipUser,
} from "@/data/model/TeamMembershipUser";
import {
  type UserRoleType,
  transformUserRoleResponse,
} from "@/data/model/UserRole";
import { type components } from "@/types/swagger";

export type TeamMembership = {
  membershipId?: number;
  user?: TeamMembershipUser;
  role: UserRoleType;
  groups?: TeamMembershipGroup[];
};

export function transformTeamMembershipResponse(
  memberships: components["schemas"]["Organization"]["members"],
): TeamMembership[] {
  return (
    memberships?.map((membership) => ({
      membershipId: membership.id,
      user: transformTeamMemberUserResponse(membership.user),
      role: transformUserRoleResponse(membership.role),
      groups: transformTeamMemberGroupsResponse(membership.groups),
    })) ?? []
  );
}
