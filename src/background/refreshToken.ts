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

import axios from "axios";
import { expectContext } from "@/utils/expectContext";
import {
  type Integration,
  type SanitizedIntegrationConfig,
} from "@/integrations/integrationTypes";
import { locator as serviceLocator } from "@/background/locator";
import {
  getCachedAuthData,
  setCachedAuthData,
} from "@/background/auth/authStorage";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  PIXIEBRIX_INTEGRATION_ID,
} from "@/integrations/constants";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Refresh an OAuth2 PKCE token. NOOP if a refresh token is not available.
 * @returns True if the token was successfully refreshed. False if the token refresh was not attempted.
 * @throws Error if the integration is not an OAuth2 PKCE integration.
 * @throws AxiosError if the token refresh failed
 */
export default async function refreshPKCEToken(
  integration: Integration,
  sanitizedConfig: SanitizedIntegrationConfig,
): Promise<boolean> {
  expectContext("background");

  if (integration.id !== sanitizedConfig.serviceId) {
    throw new Error(
      `Integration id and config service id do not match: ${integration.id} !== ${sanitizedConfig.serviceId}`,
    );
  } else if (integration.id === CONTROL_ROOM_OAUTH_INTEGRATION_ID) {
    throw new Error(
      `Use refreshPartnerAuthentication to refresh the ${CONTROL_ROOM_OAUTH_INTEGRATION_ID} token`,
    );
  } else if (!integration.isOAuth2PKCE) {
    throw new Error(
      `Expected OAuth2 PKCE integration, but got ${integration.id}`,
    );
  }

  const cachedAuthData = await getCachedAuthData(sanitizedConfig.id);

  // The PIXIEBRIX_INTEGRATION_ID check is mostly for backwards compatibility
  // to avoid dealing with undefined sanitizedConfig id's.
  if (
    integration.id !== PIXIEBRIX_INTEGRATION_ID &&
    cachedAuthData?.refresh_token
  ) {
    console.debug("Refreshing PKCE token");

    const integrationConfig = await serviceLocator.findIntegrationConfig(
      sanitizedConfig.id,
    );
    if (integrationConfig == null) {
      throw new Error(
        `Integration config not found for config id ${sanitizedConfig.id}`,
      );
    }

    const { config } = integrationConfig;
    const oauth2Context =
      // XXX: pass interactive: true to match the legacy behavior
      integration.getOAuth2Context(config, { interactive: true });
    if (oauth2Context == null) {
      throw new Error(
        `OAuth2 context not found in config for ${integration.id}`,
      );
    }

    const { tokenUrl, client_id, client_secret } = oauth2Context;
    if (tokenUrl == null) {
      throw new Error(
        `OAuth2 PKCE token URL not found in OAuth2 context for ${integration.id}`,
      );
    }

    // https://axios-http.com/docs/urlencoded
    const params = new URLSearchParams();

    params.append("grant_type", "refresh_token");
    params.append("refresh_token", cachedAuthData.refresh_token as string);
    assertNotNullish(
      client_id,
      "Client ID is required for grant_type: refresh_token",
    );
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
