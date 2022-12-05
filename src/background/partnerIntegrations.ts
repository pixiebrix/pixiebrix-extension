/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { flatten, isEmpty } from "lodash";
import { expectContext } from "@/utils/expectContext";
import { safeParseUrl } from "@/utils";
import { RegistryId } from "@/core";
import { launchOAuth2Flow } from "@/background/auth";
import { readPartnerAuthData, setPartnerAuth } from "@/auth/token";
import serviceRegistry from "@/services/registry";

import {
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  CONTROL_ROOM_SERVICE_ID,
} from "@/services/constants";
import axios from "axios";

/**
 * A principal on a remote service, e.g., an Automation Anywhere Control Room.
 */
export type PartnerPrincipal = {
  /**
   * The hostname of the remote service, e.g., the Automation Anywhere Control Room.
   */
  hostname: string;

  /**
   * The principal unique id, or null for OAuth-based integrations.
   */
  principalId: string | null;
};

/**
 * Return principals for configured remote partner integrations.
 */
export async function getPartnerPrincipals(): Promise<PartnerPrincipal[]> {
  expectContext("background");

  const partnerIds = [CONTROL_ROOM_OAUTH_SERVICE_ID, CONTROL_ROOM_SERVICE_ID];

  const auths = flatten(
    await Promise.all(
      partnerIds.map(async (id) => {
        try {
          return await serviceLocator.locateAllForService(id);
        } catch {
          // `serviceLocator` throws if the user doesn't have the service definition. Handle case where the brick
          // definition for CONTROL_ROOM_OAUTH_SERVICE_ID hasn't been made available on the server yet
          return [];
        }
      })
    )
  );

  return auths
    .filter((auth) => !isEmpty(auth.config.controlRoomUrl))
    .map((auth) => ({
      hostname: safeParseUrl(auth.config.controlRoomUrl).hostname,
      principalId: auth.config.username,
    }));
}

/**
 * Launch the browser's web auth flow get a partner token for communicating with the PixieBrix server.
 *
 * WARNING: PixieBrix should already have the required permissions (e.g., to authorize and token endpoints) before
 * calling this method.
 */
export async function launchAuthIntegration({
  serviceId,
}: {
  serviceId: RegistryId;
}): Promise<void> {
  expectContext("background");

  const service = await serviceRegistry.lookup(serviceId);

  await serviceLocator.refreshLocal();
  const allAuths = await serviceLocator.locateAllForService(serviceId);
  const localAuths = allAuths.filter((x) => !x.proxy);

  if (localAuths.length === 0) {
    throw new Error(`No local configurations found for: ${service.id}`);
  }

  if (localAuths.length > 1) {
    console.warn("Multiple local configurations found for: %s", service.id);
  }

  // `launchOAuth2Flow` expects the raw auth. In the case of CONTROL_ROOM_OAUTH_SERVICE_ID, they'll be the same
  // because it doesn't have any secrets.
  const config = await serviceLocator.getLocalConfig(localAuths[0].id);
  const data = await launchOAuth2Flow(service, config);

  if (serviceId === CONTROL_ROOM_OAUTH_SERVICE_ID) {
    // Hard-coding headers for now. In the future, will want to add support for defining in the service definition.

    if (isEmpty(config.config.controlRoomUrl)) {
      // Fine to dump to console for debugging because CONTROL_ROOM_OAUTH_SERVICE_ID doesn't have any secret props.
      console.warn("controlRoomUrl is missing on configuration", config);
      throw new Error("controlRoomUrl is missing on configuration");
    }

    console.info(
      "Setting partner auth for Control Room %s",
      config.config.controlRoomUrl
    );
    await setPartnerAuth({
      authId: config.id,
      token: data.access_token,
      // `refresh_token` only returned if offline_access scope is requested
      refreshToken: data.refresh_token,
      extraHeaders: {
        "X-Control-Room": config.config.controlRoomUrl,
      },
    });
  } else {
    throw new Error(
      `Support for login with integration not implemented: ${serviceId}`
    );
  }
}

/**
 * Refresh an Automation Anywhere JWT. NOOP if a JWT refresh token is not available.
 */
export async function _refreshPartnerToken(): Promise<void> {
  const authData = await readPartnerAuthData();
  if (authData.authId && authData.refreshToken) {
    console.debug("Refreshing partner JWT");

    const service = await serviceRegistry.lookup(CONTROL_ROOM_OAUTH_SERVICE_ID);
    const config = await serviceLocator.getLocalConfig(authData.authId);
    const context = service.getOAuth2Context(config.config);

    if (isEmpty(config.config.controlRoomUrl)) {
      // Fine to dump to console for debugging because CONTROL_ROOM_OAUTH_SERVICE_ID doesn't have any secret props.
      console.warn("controlRoomUrl is missing on configuration", config);
      throw new Error("controlRoomUrl is missing on configuration");
    }

    // https://axios-http.com/docs/urlencoded
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", context.client_id);
    params.append("refresh_token", authData.refreshToken);
    params.append("hosturl", config.config.controlRoomUrl);

    // On 401, throw the error. In the future, we might consider clearing the partnerAuth. However, currently that
    // would trigger a re-login, which may not be desirable at arbitrary times.
    const { data } = await axios.post(context.tokenUrl, params, {
      headers: { Authorization: `Basic ${btoa(context.client_id)} ` },
    });

    await setPartnerAuth({
      authId: config.id,
      token: data.access_token,
      // `refresh_token` only returned if offline_access scope is requested
      refreshToken: data.refresh_token,
      extraHeaders: {
        "X-Control-Room": config.config.controlRoomUrl,
      },
    });
  }
}

export async function safeTokenRefresh(): Promise<void> {
  try {
    await _refreshPartnerToken();
  } catch (error) {
    console.warn("Failed to refresh partner token", error);
  }
}

/**
 * Refresh partner JWT every 10 minutes, if a refresh token is available.
 */
export function initPartnerTokenRefresh(): void {
  setInterval(safeTokenRefresh, 1000 * 60 * 10);
}
