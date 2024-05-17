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
import serviceRegistry from "@/integrations/registry";
import { locator as serviceLocator } from "@/background/locator";
import { assertNotNullish } from "@/utils/nullishUtils";
import launchOAuth2Flow from "@/background/auth/launchOAuth2Flow";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/integrations/constants";
import { canParseUrl } from "@/utils/urlUtils";
import { getBaseURL } from "@/data/service/baseService";
import axios from "axios";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import chromeP from "webext-polyfill-kinda";
import { getErrorMessage } from "@/errors/errorHelpers";
import { setPartnerAuth } from "@/auth/authStorage";

/**
 * Launch the browser's web auth flow get a partner token for communicating with the PixieBrix server.
 *
 * WARNING: PixieBrix should already have the required permissions (e.g., to authorize and token endpoints) before
 * calling this method.
 */
export default async function launchAuthIntegration({
  integrationId,
}: {
  integrationId: RegistryId;
}): Promise<void> {
  expectContext("background");

  const service = await serviceRegistry.lookup(integrationId);

  await serviceLocator.refreshLocal();
  const allAuths = await serviceLocator.locateAllForService(integrationId);
  const localAuths = allAuths.filter((x) => !x.proxy);

  if (localAuths.length === 0) {
    throw new Error(`No local configurations found for: ${service.id}`);
  }

  if (localAuths.length > 1) {
    console.warn("Multiple local configurations found for: %s", service.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unnecessary-type-assertion -- just checked array length
  const authId = localAuths[0]!.id;

  // `launchOAuth2Flow` expects the raw auth. In the case of CONTROL_ROOM_OAUTH_SERVICE_ID, they'll be the same
  // because it doesn't have any secrets.
  const integrationConfig = await serviceLocator.findIntegrationConfig(authId);
  assertNotNullish(
    integrationConfig,
    `Integration config not found for authId: ${authId}`,
  );

  const data = await launchOAuth2Flow(service, integrationConfig, {
    interactive: true,
  });

  if (integrationId === CONTROL_ROOM_OAUTH_INTEGRATION_ID) {
    // Hard-coding headers for now. In the future, will want to add support for defining in the service definition.

    const { controlRoomUrl } = integrationConfig.config;
    if (!canParseUrl(controlRoomUrl)) {
      // Fine to dump to console for debugging because CONTROL_ROOM_OAUTH_SERVICE_ID doesn't have any secret props.
      console.warn(
        "controlRoomUrl is missing on configuration",
        integrationConfig,
      );
      throw new Error("controlRoomUrl is missing on configuration");
    }

    // Make a single call to the PixieBrix server with the JWT in order verify the JWT is valid for the Control Room and
    // to set up the ControlRoomPrincipal. If the token is rejected by the Control Room, the PixieBrix server will
    // return a 401.
    // Once the value is set on setPartnerAuth, a cascade of network requests will happen which causes a race condition
    // in just-in-time user initialization.
    const baseURL = await getBaseURL();
    try {
      await axios.get("/api/me/", {
        baseURL,
        headers: {
          Authorization: `Bearer ${data.access_token as string}`,
          "X-Control-Room": controlRoomUrl,
        },
      });
    } catch (error) {
      if (
        isAxiosError(error) &&
        error.response &&
        [401, 403].includes(error.response.status)
      ) {
        // Clear the token to allow the user re-login with the SAML/SSO provider
        // https://developer.chrome.com/docs/extensions/reference/identity/#method-clearAllCachedAuthTokens
        await chromeP.identity.clearAllCachedAuthTokens();

        throw new Error(
          `Control Room rejected login. Verify you are a user in the Control Room, and/or verify the Control Room SAML and AuthConfig App configuration.
          Error: ${getErrorMessage(error)}`,
        );
      }

      throw error;
    }

    console.info("Setting partner auth for Control Room %s", controlRoomUrl);

    await setPartnerAuth({
      authId: integrationConfig.id,
      token: data.access_token as string,
      // `refresh_token` only returned if offline_access scope is requested
      refreshToken: data.refresh_token as string,
      extraHeaders: {
        "X-Control-Room": controlRoomUrl,
      },
    });
  } else {
    throw new Error(
      `Support for login with integration not implemented: ${integrationId}`,
    );
  }
}
