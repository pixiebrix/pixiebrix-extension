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
  type ControlRoom,
  transformControlRoomResponse,
} from "@/data/model/ControlRoom";
import {
  type OrganizationTheme,
  transformOrganizationThemeResponse,
} from "@/data/model/OrganizationTheme";
import { components } from "@/types/swagger";
import { validateUUID } from "@/types/helpers";

export type MeOrganization = {
  /**
   * The organization's ID.
   */
  organizationId: UUID;
  /**
   * The organization's name.
   */
  organizationName: string;
  /**
   * The organization's scope for saving modsmods, if set. A string beginning with "@".
   */
  scope?: string;
  /**
   * The organization's control room, for AA orgs.
   */
  controlRoom?: ControlRoom;
  /**
   * The organization's UI theme.
   */
  organizationTheme?: OrganizationTheme;
};

export function transformMeOrganizationResponse(
  response: components["schemas"]["Me"]["organization"],
): MeOrganization {
  return {
    organizationId: validateUUID(response.id),
    organizationName: response.name,
    scope: response.scope,
    controlRoom: transformControlRoomResponse(response.control_room),
    organizationTheme: transformOrganizationThemeResponse(response.theme),
  };
}
