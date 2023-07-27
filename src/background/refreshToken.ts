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
import { type RegistryId } from "@/types/registryTypes";
import { type IntegrationConfigurationAuthData } from "@/auth/authTypes";
import {
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  GOOGLE_OAUTH_PKCE_INTEGRATION_ID,
} from "@/services/constants";
import { getCachedAuthData, setCachedAuthData } from "@/background/auth";
import { locator as serviceLocator } from "@/background/locator";
import { refreshPartnerToken } from "@/background/partnerIntegrations";

/**
 * Refresh all Google OAuth2 PKCE tokens.
 */
export async function refreshGoogleTokens(): Promise<void> {
  expectContext("background");

  const googleAuths: IntegrationConfigurationAuthData[] = [];
  const googleConfigs = await serviceLocator.locateAllForService(
    GOOGLE_OAUTH_PKCE_INTEGRATION_ID
  );

  for (const googleConfig of googleConfigs) {
    // TODO: is there anyway to avoid this await in loop? I don't think so because we need googleConfig.id after the await
    // eslint-disable-next-line no-await-in-loop
    const googleCachedAuth = await getCachedAuthData(googleConfig.id);

    if (googleCachedAuth) {
      const googleAuth: IntegrationConfigurationAuthData = {
        authId: googleConfig.id,
        token: googleCachedAuth.access_token as string,
        refreshToken: googleCachedAuth.refresh_token as string,
      };
      googleAuths.push(googleAuth);
    }
  }

  // TODO: remove this
  console.info("Refreshing google tokens", googleAuths);

  await Promise.all(
    googleAuths.map(async (googleAuth) => _refreshGoogleToken(googleAuth))
  );
}

/**
 * Refresh a Google OAuth2 PKCE token. NOOP if a refresh token is not available.
 */
export async function _refreshGoogleToken({
  authId: integrationConfigurationId,
  refreshToken,
}: IntegrationConfigurationAuthData): Promise<void> {
  if (integrationConfigurationId && refreshToken) {
    console.debug("Refreshing google token");

    const integration = await serviceRegistry.lookup(
      GOOGLE_OAUTH_PKCE_INTEGRATION_ID
    );
    const config = await serviceLocator.findIntegrationConfig(
      integrationConfigurationId
    );
    const context = integration.getOAuth2Context(config.config);

    // https://axios-http.com/docs/urlencoded
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", context.client_id);
    params.append("client_secret", context.client_secret);

    // On 401, throw the error. In the future, we might consider clearing the partnerAuth. However, currently that
    // would trigger a re-login, which may not be desirable at arbitrary times.
    const { data } = await axios.post(context.tokenUrl, params);

    // The Google refresh token response doesn't include the refresh token. Let's re-add it, so it doesn't get removed.
    if (!data.refresh_token) {
      data.refresh_token = refreshToken;
    }

    await setCachedAuthData(config.id, data);

    // TODO: remove this
    console.log("Successfully refreshed google token");
  }
}

export async function safeTokenRefresh(
  integrationId: RegistryId
): Promise<void> {
  let refreshFn;

  if (integrationId === CONTROL_ROOM_OAUTH_SERVICE_ID) {
    refreshFn = refreshPartnerToken;
  } else if (integrationId === GOOGLE_OAUTH_PKCE_INTEGRATION_ID) {
    refreshFn = refreshGoogleTokens;
  } else {
    throw new Error(
      `Support for integration not implemented: ${integrationId}`
    );
  }

  try {
    await refreshFn();
  } catch (error) {
    console.warn(`Failed to refresh ${integrationId} token:`, error);
  }
}

/**
 * The Automation Anywhere JWT has an absolute expiry of 30 days and an inactivity expiry of 15 days.
 * Refresh the JWT every week so the inactivity expiry doesn't kick in.
 */
// TODO: fix this, 20 sec is only for local development
export function initPartnerTokenRefresh(): void {
  setInterval(async () => {
    await safeTokenRefresh(CONTROL_ROOM_OAUTH_SERVICE_ID);
  }, 1000 * 20);
}

// TODO: remove this, only for development
export function initGoogleTokenRefresh(): void {
  setInterval(async () => {
    await safeTokenRefresh(GOOGLE_OAUTH_PKCE_INTEGRATION_ID);
  }, 1000 * 20);
}
