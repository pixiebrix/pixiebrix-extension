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
import { useToasts } from "react-toast-notifications";
import useAsyncEffect from "use-async-effect";
import extensionPointRegistry from "@/extensionPoints/registry";
import blockRegistry from "@/blocks/registry";
import serviceRegistry from "@/services/registry";
import { refresh as refreshLocator } from "@/background/locator";
import { useCallback, useState } from "react";

export async function refreshRegistries(): Promise<void> {
  console.debug("Refreshing bricks from the server");
  await Promise.all([
    extensionPointRegistry.fetch(),
    blockRegistry.fetch(),
    serviceRegistry.fetch(),
    refreshLocator(),
  ]);
}

export function useRefresh(
  refreshOnMount = true
): [boolean, () => Promise<void>] {
  const [loaded, setLoaded] = useState(false);
  const { addToast } = useToasts();

  const refresh = useCallback(
    async (isMounted: () => boolean = () => true) => {
      try {
        await refreshRegistries();
      } catch (error) {
        console.exception(error);
        if (!isMounted()) {
          return;
        }
        addToast(`Error refreshing bricks from server: ${error}`, {
          appearance: "error",
          autoDismiss: true,
        });
      } finally {
        if (isMounted()) {
          setLoaded(true);
        }
      }
    },
    [addToast, setLoaded]
  );

  useAsyncEffect(
    async (isMounted) => {
      if (refreshOnMount) {
        await refresh(isMounted);
      }
    },
    [refresh]
  );

  return [loaded, refresh];
}
