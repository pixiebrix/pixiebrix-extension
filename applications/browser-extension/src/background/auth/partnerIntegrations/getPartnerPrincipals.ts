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

import { type PartnerPrincipal } from "@/background/auth/partnerIntegrations/types";
import { expectContext } from "@/utils/expectContext";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "@/integrations/constants";
import { compact, flatten } from "lodash";
import { integrationConfigLocator as serviceLocator } from "@/background/integrationConfigLocator";
import { canParseUrl } from "@/utils/urlUtils";

/**
 * Return principals for configured remote partner integrations.
 */
export async function getPartnerPrincipals(): Promise<PartnerPrincipal[]> {
  expectContext("background");

  const partnerIds = [
    CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    CONTROL_ROOM_TOKEN_INTEGRATION_ID,
  ];

  const auths = flatten(
    await Promise.all(
      partnerIds.map(async (id) => {
        try {
          return await serviceLocator.findAllSanitizedConfigsForIntegration(id);
        } catch {
          // `serviceLocator` throws if the user doesn't have the service definition. Handle case where the brick
          // definition for CONTROL_ROOM_OAUTH_SERVICE_ID hasn't been made available on the server yet
          return [];
        }
      }),
    ),
  );

  return compact(
    auths.map((auth) => {
      if (canParseUrl(auth.config.controlRoomUrl)) {
        return {
          hostname: new URL(auth.config.controlRoomUrl).hostname,
          principalId: auth.config.username ?? null,
        } as PartnerPrincipal;
      }

      return null;
    }),
  );
}
