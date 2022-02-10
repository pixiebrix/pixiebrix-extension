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

import axios from "axios";
import { getApiClient, getLinkedApiClient } from "@/services/apiClient";
import { EndpointAuthError, isAxiosError } from "@/errors";
import { isAbsoluteUrl } from "@/utils";
import { enrichRequestError, isAppUrl } from "@/services/requestErrorUtils";
import { expectContext } from "@/utils/expectContext";

const HTTP_401_UNAUTHENTICATED = 401;

type FetchOptions = {
  requireLinked?: true;
};

export async function fetch<TData = unknown>(
  relativeOrAbsoluteUrl: string,
  options: FetchOptions = {}
): Promise<TData> {
  expectContext("extension");

  const absolute = isAbsoluteUrl(relativeOrAbsoluteUrl);

  const { requireLinked } = {
    requireLinked: false,
    ...options,
  };

  if (absolute) {
    if (!(await isAppUrl(relativeOrAbsoluteUrl))) {
      try {
        const { data } = await axios.get<TData>(relativeOrAbsoluteUrl);
        return data;
      } catch (error) {
        throw await enrichRequestError(error);
      }
    }

    console.warn(
      "fetch calls for the PixieBrix API should use relative URLs to support a dynamic base URL",
      {
        relativeOrAbsoluteUrl,
      }
    );
  }

  const client = await (requireLinked ? getLinkedApiClient() : getApiClient());

  try {
    const { data } = await client.get(relativeOrAbsoluteUrl);
    return data;
  } catch (error) {
    if (
      isAxiosError(error) &&
      // There are some cases where `response` is undefined (because the browser blocked the request, e.g., b/c CORS)
      // https://rollbar.com/pixiebrix/pixiebrix/items/832/
      error.response?.status === HTTP_401_UNAUTHENTICATED
    ) {
      throw new EndpointAuthError(relativeOrAbsoluteUrl);
    }

    throw await enrichRequestError(error);
  }
}
