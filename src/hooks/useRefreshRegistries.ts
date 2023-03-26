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

import { useAsyncEffect } from "use-async-effect";
import { stubTrue, throttle } from "lodash";
import { useCallback, useState } from "react";
import notify from "@/utils/notify";
import {
  clearServiceCache,
  services as serviceAuthRegistry,
} from "@/background/messenger/api";
import { syncRemotePackages } from "@/baseRegistry";

const refreshServices = async () => {
  await serviceAuthRegistry.refresh();
  // Ensure the background page is using the latest service definitions for fulfilling requests. This must come after
  // the call to serviceRegistry, because that populates the local IDB definitions.
  await clearServiceCache();
};

/**
 * Refresh registries for the current context.
 *
 * Additionally, refreshes background states necessary for making network calls.
 */
export async function refreshRegistries(): Promise<void> {
  // Sync remote packages in order to be able to remove packages that have been deleted/the user no longer has access to
  console.debug("Refreshing bricks from the server");
  await Promise.all([syncRemotePackages(), refreshServices()]);
}

const throttledRefreshRegistries = throttle(
  async () => {
    try {
      await refreshRegistries();
    } catch (error) {
      // Notify here instead of in useRefresh to prevent multiple notifications from being shown if useRefresh is used
      // in multiple components on the page.
      notify.error({ message: "Error refreshing bricks from server", error });
      console.error(error);
      throw error;
    }
  },
  // In practice, useRefresh will be mounted frequently enough in the Page Editor to cause this throttle to take
  // effect/be binding. Pick a time that's high enough to avoid the server throttling the number of requests.
  60_000,
  {
    leading: true,
    trailing: false,
  }
);

/**
 * Hook to refresh brick registries.
 * @param options hook options, e.g., whether to refresh the registries on initial hook mount.
 */
function useRefreshRegistries(options?: {
  refreshOnMount: boolean;
}): [boolean, () => Promise<void>] {
  const { refreshOnMount } = {
    refreshOnMount: true,
    ...options,
  };

  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(
    async (isMounted = stubTrue) => {
      try {
        // Use throttledRefreshRegistries to support useRefresh being included in multiple components on the page
        await throttledRefreshRegistries();
      } finally {
        if (isMounted()) {
          setLoaded(true);
        }
      }
    },
    [setLoaded]
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

export default useRefreshRegistries;
