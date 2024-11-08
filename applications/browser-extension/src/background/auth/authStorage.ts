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

import { type UUID } from "@/types/stringTypes";
import { expectContext } from "@/utils/expectContext";
import { type AuthData } from "@/integrations/integrationTypes";
import { oauth2Storage } from "@/auth/authConstants";
import chromeP from "webext-polyfill-kinda";

/**
 * Set the cached auth data for the given integration configId
 * @param configId the integration configuration id
 * @param data the data, typically the OAuth2 response
 */
export async function setCachedAuthData<TAuthData extends Partial<AuthData>>(
  configId: UUID,
  data: TAuthData,
): Promise<void> {
  expectContext(
    "background",
    "Only the background page can access oauth2 information",
  );

  const current = await oauth2Storage.get();
  await oauth2Storage.set({
    ...current,
    [configId]: data,
  });
}

/**
 * Returns true if the configId has cached auth data. NOTE: this does not check if the token is expired.
 * @param configId the integration configuration id
 */
export async function hasCachedAuthData(configId: UUID): Promise<boolean> {
  expectContext(
    "background",
    "Only the background page can access token and oauth2 data",
  );

  const current = await oauth2Storage.get();
  return Object.hasOwn(current, configId);
}

export async function getCachedAuthData(
  serviceAuthId: UUID,
): Promise<AuthData | undefined> {
  expectContext(
    "background",
    "Only the background page can access token and oauth2 data",
  );

  const current = await oauth2Storage.get();
  if (Object.hasOwn(current, serviceAuthId)) {
    // eslint-disable-next-line security/detect-object-injection -- just checked with `hasOwn`
    return current[serviceAuthId];
  }
}

/**
 * Delete the cached auth data for the given configId
 * @param configId the integration configuration id
 */
export async function deleteCachedAuthData(configId: UUID): Promise<void> {
  expectContext(
    "background",
    "Only the background page can access oauth2 information",
  );

  const current = await oauth2Storage.get();
  if (Object.hasOwn(current, configId)) {
    console.debug(`deleteCachedAuthData: removed data for auth ${configId}`);
    // eslint-disable-next-line security/detect-object-injection -- OK because we're guarding with hasOwn
    delete current[configId];

    await oauth2Storage.set(current);
  } else {
    console.warn(
      "deleteCachedAuthData: No cached auth data exists for key: %s",
      configId,
    );
  }
}

export async function removeOAuth2Token(token: string) {
  await chromeP.identity.removeCachedAuthToken({ token });
}
