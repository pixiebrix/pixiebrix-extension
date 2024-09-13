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
  type OrganizationMemberGroup,
  transformOrganizationMemberGroupsResponse,
} from "@/data/model/OrganizationMemberGroups";
import {
  transformOrganizationMemberUserResponse,
  type OrganizationMemberUser,
} from "@/data/model/OrganizationMemberUser";
import {
  type UserRoleType,
  transformUserRoleResponse,
} from "@/data/model/UserRole";
import { type components } from "@/types/swagger";

export type OrganizationMember = {
  memberId?: number;
  user?: OrganizationMemberUser;
  role: UserRoleType;
  groups?: OrganizationMemberGroup[];
};

export type OrganizationMembers = OrganizationMember[];

export function transformOrganizationMembersResponse(
  members: components["schemas"]["Organization"]["members"],
): OrganizationMembers {
  return (
    members?.map((member) => ({
      memberId: member.id,
      user: transformOrganizationMemberUserResponse(member.user),
      role: transformUserRoleResponse(member.role),
      groups: transformOrganizationMemberGroupsResponse(member.groups),
    })) ?? []
  );
}
