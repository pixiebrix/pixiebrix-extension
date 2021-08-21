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

import axios from "axios";
import { getApiClient } from "@/services/apiClient";
import { EndpointAuthError, isAxiosError } from "@/errors";
import { clearExtensionAuth, isLinked } from "@/auth/token";
import { openTab } from "@/background/executor";
import { getBaseURL } from "@/services/baseService";

export function isAbsoluteURL(url: string): boolean {
  return /^https?:\/\//.test(url);
}

const HTTP_401_UNAUTHENTICATED = 401;

export async function fetch<TData = unknown>(
  relativeOrAbsoluteUrl: string
): Promise<TData> {
  const absolute = isAbsoluteURL(relativeOrAbsoluteUrl);

  if (absolute) {
    // Make a normal request
    const { data } = await axios.get<TData>(relativeOrAbsoluteUrl);
    return data;
  }

  const linked = await isLinked();
  const client = await getApiClient();

  try {
    const { data } = await client.get(relativeOrAbsoluteUrl);
    return data;
  } catch (error: unknown) {
    if (
      isAxiosError(error) &&
      error.response.status === HTTP_401_UNAUTHENTICATED
    ) {
      if (linked) {
        // The token is incorrect - try relinking
        await clearExtensionAuth();
        await openTab({
          url: await getBaseURL(),
          active: true,
        });
      } else {
        throw new EndpointAuthError(relativeOrAbsoluteUrl);
      }
    }

    throw error;
  }
}
