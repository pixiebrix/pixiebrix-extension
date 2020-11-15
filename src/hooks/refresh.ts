/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { useToasts } from "react-toast-notifications";
import useAsyncEffect from "use-async-effect";
import extensionPointRegistry from "@/extensionPoints/registry";
import blockRegistry from "@/blocks/registry";
import serviceRegistry from "@/services/registry";
import { refresh as refreshLocator } from "@/background/locator";
import { useCallback, useState } from "react";

export function useRefresh(
  refreshOnMount = true
): [boolean, () => Promise<void>] {
  const [loaded, setLoaded] = useState(false);
  const { addToast } = useToasts();

  const refresh = useCallback(
    async (isMounted: () => boolean = () => true) => {
      try {
        console.debug("Fetching bricks from the server");
        await Promise.all([
          extensionPointRegistry.fetch(),
          blockRegistry.fetch(),
          serviceRegistry.fetch(),
          refreshLocator(),
        ]);
      } catch (exc) {
        console.exception(exc);
        if (!isMounted()) {
          return;
        }
        addToast(`Error refreshing blocks from server: ${exc}`, {
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
