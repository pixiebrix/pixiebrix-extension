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
  transformTeamMembershipResponse,
  type TeamMembership,
} from "@/data/model/TeamMemberships";
import {
  transformTeamThemeResponse,
  type TeamTheme,
} from "@/data/model/TeamTheme";
import {
  type UserRoleType,
  transformUserRoleResponse,
} from "@/data/model/UserRole";
import { validateUUID } from "@/types/helpers";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type components } from "@/types/swagger";

export type Team = {
  /**
   * The team's ID.
   */
  teamId: UUID;
  /**
   * The team's name.
   */
  teamName: string;
  /**
   * The team's memberships.
   */
  memberships: TeamMembership[] | null;
  /**
   * The team's scope.
   */
  scope: string | null;
  /**
   * The team's default role.
   */
  defaultRole: UserRoleType | null;
  /**
   * The team's partner.
   */
  partner: string | null;
  /**
   * The team's enforce update millis.
   */
  enforceUpdateMillis: number | null;
  /**
   * The team's UI theme.
   */
  theme: TeamTheme | null;

  trialEndTimestamp: Timestamp | null;
};

export function transformTeamResponse(
  baseQueryReturnValue: Array<components["schemas"]["Organization"]>,
): Team[] {
  return baseQueryReturnValue.map((apiTeam) => ({
    teamId: validateUUID(apiTeam.id),
    teamName: apiTeam.name,
    memberships: transformTeamMembershipResponse(apiTeam.members),
    scope: apiTeam.scope ?? null,
    defaultRole: apiTeam.default_role
      ? transformUserRoleResponse(apiTeam.default_role)
      : null,
    partner: apiTeam.partner ?? null,
    enforceUpdateMillis: apiTeam.enforce_update_millis ?? null,
    theme: apiTeam.theme ? transformTeamThemeResponse(apiTeam.theme) : null,
    trialEndTimestamp: apiTeam.trial_end_timestamp ?? null,
  }));
}
