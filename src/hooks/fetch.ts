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

import { useState } from "react";
import useAsyncEffect from "use-async-effect";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";
import { useToasts } from "react-toast-notifications";
import { isExtensionContext } from "@/chrome";
import { getExtensionToken } from "@/auth/token";

export function isAbsoluteURL(url: string): boolean {
  // We're testing if a URL is absolute here, not creating a URL to call
  // noinspection HttpUrlsUsage
  return url.indexOf("http://") === 0 || url.indexOf("https://") === 0;
}

export async function makeURL(relativeOrAbsoluteUrl: string): Promise<string> {
  return isAbsoluteURL(relativeOrAbsoluteUrl)
    ? relativeOrAbsoluteUrl
    : joinURL(await getBaseURL(), relativeOrAbsoluteUrl);
}

export function joinURL(host: string, relativeUrl: string): string {
  const cleanHost = host.replace(/\/$/, "");
  const cleanPath = relativeUrl.replace(/^\//, "");
  return `${cleanHost}/${cleanPath}`;
}

export async function fetch<TData>(
  relativeOrAbsoluteUrl: string
): Promise<TData> {
  const absolute = isAbsoluteURL(relativeOrAbsoluteUrl);

  const url = absolute
    ? relativeOrAbsoluteUrl
    : joinURL(await getBaseURL(), relativeOrAbsoluteUrl);

  if (!absolute && isExtensionContext()) {
    const token = await getExtensionToken();
    const { data, status, statusText } = await axios.get(url, {
      headers: {
        Authorization: token ? `Token ${token}` : undefined,
      },
    });
    if (status === 401) {
      throw new Error("Authentication required");
    } else if (status === 403) {
      throw new Error("Invalid key for service endpoint");
    } else if (status >= 300) {
      throw new Error(`Request error: ${statusText}`);
    }
    return data;
  }
  const { data } = await axios.get<TData>(url);
  return data;
}

/**
 * Hook for fetching information from a URL.
 * @param relativeOrAbsoluteUrl
 * @deprecated use the useFetch hook, which tracks loading state and errors
 */
export function useFetch<TData>(
  relativeOrAbsoluteUrl: string
): TData | undefined {
  const [host] = useAsyncState(getBaseURL);
  const { addToast } = useToasts();
  const [data, setData] = useState<TData>();

  useAsyncEffect(
    async (isMounted) => {
      if (host) {
        // eslint-disable-next-line unicorn/no-useless-undefined -- TypeScript requires argument here
        setData(undefined);
        try {
          const data = (await fetch(relativeOrAbsoluteUrl)) as TData;
          if (!isMounted()) return;
          setData(data);
        } catch (error) {
          console.exception(error);
          if (isMounted()) {
            addToast(`An error occurred fetching data from the server`, {
              appearance: "error",
              autoDismiss: true,
            });
          }
        }
      }
    },
    [host, relativeOrAbsoluteUrl, setData]
  );

  return data;
}
