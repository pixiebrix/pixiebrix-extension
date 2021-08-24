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
import { useAsyncEffect } from "use-async-effect";
import extensionPointRegistry from "@/extensionPoints/registry";
import blockRegistry from "@/blocks/registry";
import serviceRegistry from "@/services/registry";
import { stubTrue } from "lodash";
import { refresh as refreshLocator } from "@/background/locator";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/errors";
import useNotifications from "@/hooks/useNotifications";

/**
 * Refresh registries for the current context.
 *
 * NOTE: calling this method does not update the locator/service definitions for the background page unless this method
 * is called from the background page.
 */
export async function refreshRegistries(): Promise<void> {
  console.debug("Refreshing bricks from the server");
  await Promise.all([
    extensionPointRegistry.fetch(),
    blockRegistry.fetch(),
    serviceRegistry.fetch(),
    refreshLocator(),
  ]);
}

function useRefresh(options?: {
  refreshOnMount: boolean;
}): [boolean, () => Promise<void>] {
  const { refreshOnMount } = {
    refreshOnMount: true,
    ...options,
  };

  const [loaded, setLoaded] = useState(false);
  const notify = useNotifications();

  const refresh = useCallback(
    async (isMounted = stubTrue) => {
      try {
        await refreshRegistries();
      } catch (error: unknown) {
        console.error(error);
        if (!isMounted()) {
          return;
        }

        notify.error(
          `Error refreshing bricks from server: ${getErrorMessage(error)}`,
          {
            error,
          }
        );
      } finally {
        if (isMounted()) {
          setLoaded(true);
        }
      }
    },
    [notify, setLoaded]
  );

  useAsyncEffect(
    async (isMounted) => {
      if (refreshOnMount) {
        await refresh(isMounted);
      }
    },
    // Dependencies intentionally left blank -- only running on the initial mount
    []
  );

  return [loaded, refresh];
}

export default useRefresh;
