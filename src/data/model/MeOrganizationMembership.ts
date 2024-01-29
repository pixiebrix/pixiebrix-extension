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

import { type UUID } from "@/types/stringTypes";
import {
  transformUserOrganizationMembershipRoleResponse,
  type UserOrganizationMembershipRole,
} from "@/data/model/UserOrganizationMembershipRole";
import {
  type ControlRoom,
  transformControlRoomResponse,
} from "@/data/model/ControlRoom";
import { components } from "@/types/swagger";
import { validateUUID } from "@/types/helpers";

export type MeOrganizationMembership = {
  /**
   * The member organization id
   */
  organizationId: UUID;
  organizationName: string;
  userOrganizationRole: UserOrganizationMembershipRole;
  organizationScope?: string;
  /**
   * Whether the (parent) user is a manager of one or more team deployments for the organization
   * */
  meUserIsDeploymentManager: boolean;
  organizationControlRoom?: ControlRoom;
};

export function transformMeOrganizationMembershipResponse(
  response: components["schemas"]["Me"]["organization_memberships"][number],
): MeOrganizationMembership {
  const membership: MeOrganizationMembership = {
    organizationId: validateUUID(response.organization),
    organizationName: response.organization_name,
    userOrganizationRole: transformUserOrganizationMembershipRoleResponse(
      response.role,
    ),
    meUserIsDeploymentManager: response.is_deployment_manager ?? false,
  };

  if (response.scope) {
    membership.organizationScope = response.scope;
  }

  if (response.control_room) {
    membership.organizationControlRoom = transformControlRoomResponse(
      response.control_room,
    );
  }

  return membership;
}
