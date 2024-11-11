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

import { type AuthData } from "@/integrations/integrationTypes";
import { expectContext } from "@/utils/expectContext";
import { getPartnerAuthData, setPartnerAuthData } from "@/auth/authStorage";
import axios, { type AxiosResponse } from "axios";
import { setCachedAuthData } from "@/background/auth/authStorage";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Refreshes the partner authentication token for the current partner auth session.
 *
 * @throws Error if no current partner auth data is found, or the current data does
 * not contain a refresh token, or if something goes wrong with the refresh request
 */
export default async function refreshPartnerAuthentication(): Promise<void> {
  expectContext("background");

  const partnerAuthData = await getPartnerAuthData();
  if (!partnerAuthData) {
    throw new Error("No partner auth data found for partner token refresh");
  }

  const {
    authId,
    refreshToken,
    refreshUrl,
    refreshParamPayload,
    refreshExtraHeaders,
  } = partnerAuthData;

  assertNotNullish(
    refreshToken,
    "No refresh token found for authId: " + authId,
  );
  assertNotNullish(refreshUrl, "No refresh URL found for authId: " + authId);

  console.debug("Refreshing partner JWT for authId: " + authId);

  const postData = refreshParamPayload
    ? new URLSearchParams(refreshParamPayload)
    : undefined;
  // This will automatically throw the error on a 401 (or other bad response
  // status code), allow the caller to decide how to handle
  const { data }: AxiosResponse<AuthData> = await axios.post(
    refreshUrl,
    postData,
    {
      headers: refreshExtraHeaders ?? {},
    },
  );

  await setCachedAuthData(authId, data);

  const { access_token: newSessionToken, refresh_token: newRefreshToken } =
    data;

  await setPartnerAuthData({
    ...partnerAuthData,
    token: newSessionToken as string,
    refreshToken: newRefreshToken as string,
    refreshParamPayload: {
      ...refreshParamPayload,
      refresh_token: newRefreshToken as string,
    },
  });

  console.debug("Successfully refreshed partner JWT for authId: " + authId);
}
