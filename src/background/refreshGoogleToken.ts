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

import axios from "axios";
import { expectContext } from "@/utils/expectContext";
import serviceRegistry from "@/services/registry";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { GOOGLE_OAUTH_PKCE_INTEGRATION_ID } from "@/services/constants";
import { getCachedAuthData, setCachedAuthData } from "@/background/auth";
import { locator as serviceLocator } from "@/background/locator";

/**
 * Refresh a Google OAuth2 PKCE token. NOOP if a refresh token is not available.
 */
export default async function refreshGoogleToken(
  integrationConfig: SanitizedIntegrationConfig
): Promise<void> {
  expectContext("background");

  if (integrationConfig.serviceId !== GOOGLE_OAUTH_PKCE_INTEGRATION_ID) {
    throw new Error(
      `Expected integration to be ${GOOGLE_OAUTH_PKCE_INTEGRATION_ID}, but got ${integrationConfig.serviceId}`
    );
  }

  const cachedAuthData = await getCachedAuthData(integrationConfig.id);

  // TODO: remove this
  console.info("Refreshing google token", integrationConfig, cachedAuthData);

  if (integrationConfig.id && cachedAuthData?.refresh_token) {
    console.debug("Refreshing google token");

    const integration = await serviceRegistry.lookup(
      GOOGLE_OAUTH_PKCE_INTEGRATION_ID
    );
    const { config } = await serviceLocator.findIntegrationConfig(
      integrationConfig.id
    );
    const context = integration.getOAuth2Context(config);

    // https://axios-http.com/docs/urlencoded
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", cachedAuthData.refresh_token as string);
    params.append("client_id", context.client_id);
    params.append("client_secret", context.client_secret);

    // On 401, throw the error. In the future, we might consider clearing the partnerAuth. However, currently that
    // would trigger a re-login, which may not be desirable at arbitrary times.
    const { data } = await axios.post(context.tokenUrl, params);

    // The Google refresh token response doesn't include the refresh token. Let's re-add it, so it doesn't get removed.
    if (!data.refresh_token) {
      data.refresh_token = cachedAuthData.refresh_token;
    }

    await setCachedAuthData(integrationConfig.id, data);

    // TODO: remove this
    console.log("Successfully refreshed google token");
  }
}

// TODO: remove this, only for development
export function initGoogleTokenRefresh(): void {
  setInterval(async () => {
    const googleIntegrationConfigs = await serviceLocator.locateAllForService(
      GOOGLE_OAUTH_PKCE_INTEGRATION_ID
    );
    if (googleIntegrationConfigs.length > 0) {
      await refreshGoogleToken(googleIntegrationConfigs[0]);
    }
  }, 1000 * 10);
}
