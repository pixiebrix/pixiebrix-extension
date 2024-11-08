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

import type { SanitizedIntegrationConfig } from "../integrationTypes";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "../constants";
import { checkConfigAuth } from "../../contrib/automationanywhere/aaApi";

export async function checkIntegrationAuth(
  config: SanitizedIntegrationConfig,
): Promise<boolean> {
  switch (config.serviceId) {
    case CONTROL_ROOM_OAUTH_INTEGRATION_ID:
    case CONTROL_ROOM_TOKEN_INTEGRATION_ID: {
      return checkConfigAuth(config);
    }

    default: {
      // Default to true for integrations we haven't configured yet for auth checks
      return true;
    }
  }
}
