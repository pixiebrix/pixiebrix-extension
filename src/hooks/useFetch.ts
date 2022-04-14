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

import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import { useCallback, useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { fetch } from "@/hooks/fetch";
import notify from "@/utils/notify";

type FetchState<TData = unknown> = {
  data: TData | undefined;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

function useFetch<TData = unknown>(
  relativeOrAbsoluteUrl: string
): FetchState<TData> {
  const [host] = useAsyncState(getBaseURL);
  const [data, setData] = useState<TData | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>();

  const refresh = useCallback(async () => {
    try {
      const data = await fetch<TData>(relativeOrAbsoluteUrl);
      setData(data);
    } catch (error) {
      setError(error);
      notify.error("An error occurred fetching data from the server");
    }
  }, [relativeOrAbsoluteUrl, setData]);

  useAsyncEffect(
    async (isMounted) => {
      if (host) {
        setIsLoading(true);
        // eslint-disable-next-line unicorn/no-useless-undefined -- be explicit about resetting value
        setData(undefined);
        try {
          const data = await fetch<TData>(relativeOrAbsoluteUrl);
          if (!isMounted()) return;
          setData(data);
        } catch (error) {
          if (!isMounted()) return;
          setError(error);
          notify.error({
            message: "An error occurred fetching data from the server",
            error,
          });
        } finally {
          if (isMounted()) {
            setIsLoading(false);
          }
        }
      }
    },
    [host, relativeOrAbsoluteUrl, setData, setIsLoading, setError]
  );

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export default useFetch;
