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

import { type UUID } from "@/types/stringTypes";
import { expectContext } from "@/utils/expectContext";
import { type AuthData } from "@/integrations/integrationTypes";
import { oauth2Storage } from "@/auth/authConstants";

export async function setCachedAuthData<TAuthData extends Partial<AuthData>>(
  serviceAuthId: UUID,
  data: TAuthData,
): Promise<void> {
  expectContext(
    "background",
    "Only the background page can access oauth2 information",
  );

  const current = await oauth2Storage.get();
  await oauth2Storage.set({
    ...current,
    [serviceAuthId]: data,
  });
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

export async function deleteCachedAuthData(serviceAuthId: UUID): Promise<void> {
  expectContext(
    "background",
    "Only the background page can access oauth2 information",
  );

  const current = await oauth2Storage.get();
  if (Object.hasOwn(current, serviceAuthId)) {
    console.debug(
      `deleteCachedAuthData: removed data for auth ${serviceAuthId}`,
    );
    // OK because we're guarding with hasOwn
    // eslint-disable-next-line security/detect-object-injection
    delete current[serviceAuthId];

    await oauth2Storage.set(current);
  } else {
    console.warn(
      "deleteCachedAuthData: No cached auth data exists for key: %s",
      serviceAuthId,
    );
  }
}
