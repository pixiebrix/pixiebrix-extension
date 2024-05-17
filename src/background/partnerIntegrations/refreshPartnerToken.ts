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

import { locator as serviceLocator } from "@/background/locator";
import { expectContext } from "@/utils/expectContext";
import { readPartnerAuthData, setPartnerAuth } from "@/auth/authStorage";
import serviceRegistry from "@/integrations/registry";
import axios from "axios";
import { setCachedAuthData } from "@/background/auth/authStorage";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/integrations/constants";
import { stringToBase64 } from "uint8array-extras";
import { canParseUrl } from "@/utils/urlUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Refresh an Automation Anywhere JWT. NOOP if a JWT refresh token is not available.
 */
export default async function _refreshPartnerToken(): Promise<void> {
  expectContext("background");

  const authData = await readPartnerAuthData();

  if (authData.authId && authData.refreshToken) {
    console.debug("Refreshing partner JWT");

    const service = await serviceRegistry.lookup(
      CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    );
    const integrationConfig = await serviceLocator.findIntegrationConfig(
      authData.authId,
    );
    assertNotNullish(
      integrationConfig,
      `Integration config not found for authId: ${authData.authId}`,
    );

    const { controlRoomUrl } = integrationConfig.config;
    if (!canParseUrl(controlRoomUrl)) {
      // Fine to dump to console for debugging because CONTROL_ROOM_OAUTH_SERVICE_ID doesn't have any secret props.
      console.warn(
        "controlRoomUrl is missing on configuration",
        integrationConfig,
      );
      throw new Error("controlRoomUrl is missing on configuration");
    }

    const context = service.getOAuth2Context(integrationConfig.config);
    assertNotNullish(context, "Service did not return an OAuth2 context");
    assertNotNullish(
      context.tokenUrl,
      `OAuth2 context for service ${integrationConfig.integrationId} does not include a token URL`,
    );

    // https://axios-http.com/docs/urlencoded
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", context.client_id);
    params.append("refresh_token", authData.refreshToken);
    params.append("hosturl", controlRoomUrl);

    // On 401, throw the error. In the future, we might consider clearing the partnerAuth. However, currently that
    // would trigger a re-login, which may not be desirable at arbitrary times.
    const { data } = await axios.post(context.tokenUrl, params, {
      headers: { Authorization: `Basic ${stringToBase64(context.client_id)} ` },
    });

    // Store for use direct calls to the partner API
    await setCachedAuthData(integrationConfig.id, data);

    // Store for use with the PixieBrix API
    await setPartnerAuth({
      authId: integrationConfig.id,
      token: data.access_token,
      // `refresh_token` only returned if offline_access scope is requested
      refreshToken: data.refresh_token,
      extraHeaders: {
        "X-Control-Room": controlRoomUrl,
      },
    });

    console.debug("Successfully refreshed partner token");
  }
}
