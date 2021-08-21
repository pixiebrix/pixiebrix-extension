/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import axios, { AxiosInstance } from "axios";
import { getBaseURL } from "@/services/baseService";
import { getExtensionToken } from "@/auth/token";
import { ExtensionNotLinkedError } from "@/errors";

/**
 * Returns axios client for making authenticated API requests to PixieBrix.
 * @throws Error if the extension has not been linked to the API yet
 */
export async function getLinkedClient(): Promise<AxiosInstance> {
  const token = await getExtensionToken();

  if (!token) {
    throw new ExtensionNotLinkedError();
  }

  return axios.create({
    baseURL: await getBaseURL(),
    headers: {
      Authorization: `Token ${token}`,
      // Version 2.0 is paginated. Explicitly pass version so we can switch the default version on the server when
      // once clients are all passing an explicit version number
      Accept: "application/json; version=1.0",
    },
  });
}

/**
 * Returns axios client for making (optionally) authenticated API requests to PixieBrix.
 */
export async function getApiClient(): Promise<AxiosInstance> {
  const token = await getExtensionToken();

  return axios.create({
    baseURL: await getBaseURL(),
    headers: {
      Authorization: token ? `Token ${token}` : undefined,
      // Version 2.0 is paginated. Explicitly pass version so we can switch the default version on the server when
      // once clients are all passing an explicit version number
      Accept: "application/json; version=1.0",
    },
  });
}
