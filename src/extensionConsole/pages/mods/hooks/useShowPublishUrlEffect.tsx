/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { useHistory, useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import {
  modModalsSlice,
  type PublishContext,
} from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import { validateRegistryId, validateUUID } from "@/types/helpers";

function useShowPublishUrlParams(): {
  showPublish: boolean;
  modId: string | null;
  modComponentId: string | null;
} {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  return {
    showPublish: params.get("publish") === "1",
    // Backwards compatible with old URL param names (blueprintId, extensionId)
    modId: params.get("modId") ?? params.get("blueprintId"),
    modComponentId: params.get("modComponentId") ?? params.get("extensionId"),
  };
}

// Supports showing the publish modal via URL, e.g. to link from the Sidebar
const useShowPublishUrlEffect = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const { showPublish, modId, modComponentId } = useShowPublishUrlParams();

  useEffect(() => {
    // Both modId & modComponentId being set should never happen in practice, but
    // at least one of them needs to be present
    const validShareContext =
      (modId || modComponentId) && !(modId && modComponentId);

    if (showPublish && validShareContext) {
      const publishContext: PublishContext = {};

      if (modId) {
        publishContext.modId = validateRegistryId(modId);
      }

      if (modComponentId) {
        publishContext.modComponentId = validateUUID(modComponentId);
      }

      dispatch(modModalsSlice.actions.setPublishContext(publishContext));

      // Remove the search params after showing the modal
      history.push("/");
    }
  }, [dispatch, history, modComponentId, modId, showPublish]);
};

export default useShowPublishUrlEffect;
