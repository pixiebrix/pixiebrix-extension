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

import { type UUID } from "@/types/stringTypes";
import {
  type ControlRoom,
  transformControlRoomResponse,
} from "@/data/model/ControlRoom";
import {
  type TeamTheme,
  transformTeamThemeResponse,
} from "@/data/model/TeamTheme";
import { type components } from "@/types/swagger";
import { validateUUID } from "@/types/helpers";
import { type SetRequired } from "type-fest";

export type MeTeam = {
  /**
   * The team's ID.
   */
  teamId: UUID;
  /**
   * The team's name.
   */
  teamName: string;
  /**
   * Whether the team is an enterprise team.
   */
  isEnterprise: boolean;
  /**
   * The team's scope for saving modsmods, if set. A string beginning with "@".
   */
  scope?: string;
  /**
   * The team's control room, for AA orgs.
   */
  controlRoom?: ControlRoom;
  /**
   * The team's UI theme.
   */
  teamTheme?: TeamTheme;
};

export function transformMeTeamResponse(
  response: SetRequired<
    components["schemas"]["Me"],
    "organization"
  >["organization"],
): MeTeam {
  const team: MeTeam = {
    teamId: validateUUID(response.id),
    teamName: response.name,
    isEnterprise: response.is_enterprise ?? false,
  };

  if (response.scope) {
    team.scope = response.scope;
  }

  if (response.control_room) {
    team.controlRoom = transformControlRoomResponse(response.control_room);
  }

  if (response.theme) {
    team.teamTheme = transformTeamThemeResponse(response.theme);
  }

  return team;
}
