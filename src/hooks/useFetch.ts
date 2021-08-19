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

import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import { useToasts } from "react-toast-notifications";
import { useCallback, useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { fetch } from "@/hooks/fetch";

type FetchState<TData> = {
  data: TData | undefined;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

function useFetch<TData>(relativeOrAbsoluteUrl: string): FetchState<TData> {
  const [host] = useAsyncState(getBaseURL);
  const { addToast } = useToasts();
  const [data, setData] = useState<TData>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>();

  const refresh = useCallback(async () => {
    try {
      const data = await fetch<TData>(relativeOrAbsoluteUrl);
      setData(data);
    } catch (error: unknown) {
      setError(error);
      addToast(`An error occurred fetching data from the server`, {
        appearance: "error",
        autoDismiss: true,
      });
    }
  }, [addToast, relativeOrAbsoluteUrl, setData]);

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
        } catch (error: unknown) {
          if (!isMounted()) return;
          setError(error);
          addToast(`An error occurred fetching data from the server`, {
            appearance: "error",
            autoDismiss: true,
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
