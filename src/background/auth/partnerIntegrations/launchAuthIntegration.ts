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

import type { RegistryId } from "@/types/registryTypes";
import { expectContext } from "@/utils/expectContext";
import integrationRegistry from "@/integrations/registry";
import { integrationConfigLocator as serviceLocator } from "@/background/integrationConfigLocator";
import { assertNotNullish } from "@/utils/nullishUtils";
import launchOAuth2Flow from "@/background/auth/launchOAuth2Flow";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/integrations/constants";
import { canParseUrl } from "@/utils/urlUtils";
import { getErrorMessage } from "@/errors/errorHelpers";
import { setPartnerAuthData } from "@/auth/authStorage";
import { stringToBase64 } from "uint8array-extras";
import { getApiClient } from "@/data/service/apiClient";
import { selectAxiosError } from "@/data/service/requestErrorUtils";
import { isAuthenticationAxiosError } from "@/auth/isAuthenticationAxiosError";
import { removeOAuth2Token } from "@/background/messenger/api";
import {
  ME_API_VERSION,
  getRequestHeadersByAPIVersion,
} from "@/data/service/apiVersioning";

/**
 * Launch the browser's web auth flow get a partner token for communicating with the PixieBrix server.
 *
 * WARNING: PixieBrix should already have the required permissions (e.g., to authorize and token endpoints) before
 * calling this method.
 */
export async function launchAuthIntegration({
  integrationId,
}: {
  integrationId: RegistryId;
}): Promise<void> {
  expectContext("background");

  const integration = await integrationRegistry.lookup(integrationId);

  await serviceLocator.refreshLocal();
  const allAuths =
    await serviceLocator.findAllSanitizedConfigsForIntegration(integrationId);
  const localAuths = allAuths.filter((x) => !x.proxy);

  if (localAuths.length === 0) {
    throw new Error(`No local configurations found for: ${integration.id}`);
  }

  if (localAuths.length > 1) {
    console.warn("Multiple local configurations found for: %s", integration.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unnecessary-type-assertion -- just checked array length
  const authId = localAuths[0]!.id;

  // `launchOAuth2Flow` expects the raw auth. In the case of CONTROL_ROOM_OAUTH_INTEGRATION_ID, they'll be the same
  // because it doesn't have any secrets.
  const integrationConfig = await serviceLocator.findIntegrationConfig(authId);
  assertNotNullish(
    integrationConfig,
    `Integration config not found for authId: ${authId}`,
  );

  const newAuthData = await launchOAuth2Flow(integration, integrationConfig, {
    interactive: true,
  });

  if (integrationId === CONTROL_ROOM_OAUTH_INTEGRATION_ID) {
    // Hard-coding headers for now. In the future, will want to add support for defining in the integration definition.

    const { controlRoomUrl } = integrationConfig.config;
    if (!canParseUrl(controlRoomUrl)) {
      // Fine to dump to console for debugging because CONTROL_ROOM_OAUTH_INTEGRATION_ID doesn't have any secret props.
      console.warn(
        "controlRoomUrl is missing on configuration",
        integrationConfig,
      );
      throw new Error("controlRoomUrl is missing on configuration");
    }

    if (newAuthData.access_token == null) {
      throw new Error(
        "access_token not found in launchOAuth2Flow() result for Control Room login",
      );
    }

    const token = newAuthData.access_token as string;
    // `refresh_token` only returned if offline_access scope is requested
    const refreshToken = (newAuthData.refresh_token ?? null) as string | null;

    // Make a single call to the PixieBrix server with the JWT in order verify the JWT is valid for the Control Room and
    // to set up the ControlRoomPrincipal. If the token is rejected by the Control Room, the PixieBrix server will
    // return a 401.
    // Once the value is set on setPartnerAuthData, a cascade of network requests will happen which causes a race condition
    // in just-in-time user initialization.
    const apiClient = await getApiClient();
    try {
      await apiClient.get("/api/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Control-Room": controlRoomUrl,
          ...getRequestHeadersByAPIVersion(ME_API_VERSION),
        },
      });
    } catch (error) {
      const axiosError = selectAxiosError(error);
      if (!axiosError || !isAuthenticationAxiosError(axiosError)) {
        throw error;
      }

      // Clear the token to allow the user re-login with the SAML/SSO provider
      // await chromeP.identity.removeCachedAuthToken({ token });
      await removeOAuth2Token(token);

      throw new Error(
        `Control Room rejected login. Verify you are a user in the Control Room, and/or verify the Control Room SAML and AuthConfig App configuration.
          Error: ${getErrorMessage(error)}`,
      );
    }

    const oAuth2Context = integration.getOAuth2Context(
      integrationConfig.config,
    );
    assertNotNullish(
      oAuth2Context,
      "Integration did not return an OAuth2 context",
    );

    const refreshUrl = refreshToken ? oAuth2Context.tokenUrl ?? null : null;

    console.info("Setting partner auth for Control Room %s", controlRoomUrl);

    let refreshParamPayload: Record<string, string> | null = null;
    let refreshExtraHeaders: Record<string, string> | null = null;
    if (refreshToken) {
      assertNotNullish(
        oAuth2Context.client_id,
        "OAuth2 client_id is required for partner refresh token, but was not found in the oAuth2Context",
      );

      refreshParamPayload = {
        hosturl: controlRoomUrl,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: oAuth2Context.client_id,
      };
      refreshExtraHeaders = {
        Authorization: `Basic ${stringToBase64(oAuth2Context.client_id)}`,
      };
    }

    await setPartnerAuthData({
      authId: integrationConfig.id,
      token,
      refreshToken,
      refreshUrl,
      refreshParamPayload,
      refreshExtraHeaders,
      extraHeaders: {
        "X-Control-Room": controlRoomUrl,
      },
    });

    // Refactor - TODO: At some point, this whole thing should probably be a
    //  switch statement that calls separate helper functions for each supported
    //  integration id, to de-couple the general auth integration logic from
    //  any partner-specific code.
    return;
  }

  throw new Error(
    `Support for login with integration not implemented: ${integrationId}`,
  );
}
