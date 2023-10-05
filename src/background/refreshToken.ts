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
import {
  type Integration,
  type SanitizedIntegrationConfig,
} from "@/types/integrationTypes";
import { locator as serviceLocator } from "@/background/locator";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/services/constants";
import {
  getCachedAuthData,
  setCachedAuthData,
} from "@/background/auth/authStorage";

/**
 * Refresh an OAuth2 PKCE token. NOOP if a refresh token is not available.
 * @returns True if the token was successfully refreshed. False if the token refresh was not attempted.
 * @throws Error if the integration is not an OAuth2 PKCE integration.
 * @throws AxiosError if the token refresh failed
 */
export default async function refreshPKCEToken(
  integration: Integration,
  integrationConfig: SanitizedIntegrationConfig
): Promise<boolean> {
  expectContext("background");

  if (integration.id !== integrationConfig.serviceId) {
    throw new Error(
      `Integration id and config service id do not match: ${integration.id} !== ${integrationConfig.serviceId}`
    );
  } else if (integration.id === CONTROL_ROOM_OAUTH_INTEGRATION_ID) {
    throw new Error(
      `Use _refreshPartnerToken to refresh the ${CONTROL_ROOM_OAUTH_INTEGRATION_ID} token`
    );
  } else if (!integration.isOAuth2PKCE) {
    throw new Error(
      `Expected OAuth2 PKCE integration, but got ${integration.id}`
    );
  }

  const cachedAuthData = await getCachedAuthData(integrationConfig.id);

  if (integrationConfig.id && cachedAuthData?.refresh_token) {
    console.debug("Refreshing PKCE token");

    const { config } = await serviceLocator.findIntegrationConfig(
      integrationConfig.id
    );
    const { tokenUrl, client_id, client_secret } =
      integration.getOAuth2Context(config);

    // https://axios-http.com/docs/urlencoded
    const params = new URLSearchParams();

    params.append("grant_type", "refresh_token");
    params.append("refresh_token", cachedAuthData.refresh_token as string);
    params.append("client_id", client_id);

    // Google PKCE requires a client secret, see https://developers.google.com/identity/protocols/oauth2/native-app
    if (client_secret) {
      params.append("client_secret", client_secret);
    }

    const { data } = await axios.post(tokenUrl, params);

    // Add the cached refresh token to the response if it's missing, so it doesn't get removed.
    // - The Google refresh token response doesn't include a refresh token.
    // - The Azure refresh token response includes a new refresh token that we should replace the cached one with.
    //   See https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#refresh-the-access-token
    data.refresh_token ??= cachedAuthData.refresh_token;

    await setCachedAuthData(integrationConfig.id, data);

    console.debug("Successfully refreshed PKCE token");

    return true;
  }

  return false;
}
