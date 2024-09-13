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
  type OrganizationMembershipGroup,
  transformOrganizationMemberGroupsResponse,
} from "@/data/model/OrganizationMembershipGroups";
import {
  transformOrganizationMemberUserResponse,
  type OrganizationMembershipUser,
} from "@/data/model/OrganizationMembershipUser";
import {
  type UserRoleType,
  transformUserRoleResponse,
} from "@/data/model/UserRole";
import { type components } from "@/types/swagger";

export type OrganizationMembership = {
  memberId?: number;
  user?: OrganizationMembershipUser;
  role: UserRoleType;
  groups?: OrganizationMembershipGroup[];
};

export function transformOrganizationMembershipResponse(
  members: components["schemas"]["Organization"]["members"],
): OrganizationMembership[] {
  return (
    members?.map((member) => ({
      memberId: member.id,
      user: transformOrganizationMemberUserResponse(member.user),
      role: transformUserRoleResponse(member.role),
      groups: transformOrganizationMemberGroupsResponse(member.groups),
    })) ?? []
  );
}
