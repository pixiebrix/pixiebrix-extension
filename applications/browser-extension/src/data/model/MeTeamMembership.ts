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

import { type UUID } from "../../types/stringTypes";
import {
  transformUserRoleResponse,
  type UserRoleType,
} from "./UserRole";
import {
  type ControlRoom,
  transformControlRoomResponse,
} from "./ControlRoom";
import { validateUUID } from "../../types/helpers";
import { type RequiredMeTeamMembershipResponse } from "../service/responseTypeHelpers";

export type MeTeamMembership = {
  /**
   * The member team id
   */
  teamId: UUID;
  teamName: string;
  userTeamRole: UserRoleType;
  /**
   * Whether the (parent) user is a manager of one or more team deployments for the team
   */
  meUserIsDeploymentManager: boolean;
  teamScope?: string;
  teamControlRoom?: ControlRoom;
};

export function transformMeTeamMembershipResponse(
  response: RequiredMeTeamMembershipResponse,
): MeTeamMembership {
  const membership: MeTeamMembership = {
    teamId: validateUUID(response.organization),
    teamName: response.organization_name,
    userTeamRole: transformUserRoleResponse(response.role),
    meUserIsDeploymentManager: response.is_deployment_manager ?? false,
  };

  if (response.scope) {
    membership.teamScope = response.scope;
  }

  if (response.control_room) {
    membership.teamControlRoom = transformControlRoomResponse(
      response.control_room,
    );
  }

  return membership;
}
