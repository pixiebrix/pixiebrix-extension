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

import {
  type ManualStorageKey,
  readStorage,
  setStorage,
} from "@/utils/storageUtils";
import { type UUID } from "@/types/stringTypes";
import { expectContext } from "@/utils/expectContext";
import { type AuthData } from "@/types/integrationTypes";

export const OAUTH2_STORAGE_KEY = "OAUTH2" as ManualStorageKey;

export async function setCachedAuthData<TAuthData extends Partial<AuthData>>(
  serviceAuthId: UUID,
  data: TAuthData
): Promise<void> {
  expectContext(
    "background",
    "Only the background page can access oauth2 information"
  );

  const current = await readStorage<Record<UUID, TAuthData>>(
    OAUTH2_STORAGE_KEY,
    {}
  );
  await setStorage(OAUTH2_STORAGE_KEY, {
    ...current,
    [serviceAuthId]: data,
  });
}

export async function getCachedAuthData(
  serviceAuthId: UUID
): Promise<AuthData | undefined> {
  expectContext(
    "background",
    "Only the background page can access token and oauth2 data"
  );

  const current = await readStorage<Record<UUID, AuthData>>(
    OAUTH2_STORAGE_KEY,
    {}
  );
  if (Object.hasOwn(current, serviceAuthId)) {
    // eslint-disable-next-line security/detect-object-injection -- just checked with `hasOwn`
    return current[serviceAuthId];
  }
}

export async function deleteCachedAuthData(serviceAuthId: UUID): Promise<void> {
  expectContext(
    "background",
    "Only the background page can access oauth2 information"
  );

  const current = await readStorage<Record<UUID, AuthData>>(
    OAUTH2_STORAGE_KEY,
    {}
  );
  if (Object.hasOwn(current, serviceAuthId)) {
    console.debug(
      `deleteCachedAuthData: removed data for auth ${serviceAuthId}`
    );
    // OK because we're guarding with hasOwn
    // eslint-disable-next-line security/detect-object-injection
    delete current[serviceAuthId];
    await setStorage(OAUTH2_STORAGE_KEY, current);
  } else {
    console.warn(
      "deleteCachedAuthData: No cached auth data exists for key: %s",
      serviceAuthId
    );
  }
}
