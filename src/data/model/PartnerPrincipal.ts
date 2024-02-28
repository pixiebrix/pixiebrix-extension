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

import { type components } from "@/types/swagger";

export type PartnerPrincipal = {
  /**
   * AA unique identifier used to interact with the Control Room user via the AA API.
   * format: int64
   */
  controlRoomUserId: number;
  controlRoomUrl: URL;
};

export function transformPartnerPrincipalResponse(
  response: components["schemas"]["Me"]["partner_principals"][number],
): PartnerPrincipal {
  return {
    controlRoomUserId: response.control_room_user_id,
    controlRoomUrl: new URL(response.control_room_url),
  };
}
