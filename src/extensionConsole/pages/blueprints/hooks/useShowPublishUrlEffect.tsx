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

import { useHistory, useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import {
  blueprintModalsSlice,
  type PublishContext,
} from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";

// Supports showing the publish modal via URL, e.g. to link from the Sidebar
const useShowPublishUrlEffect = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const history = useHistory();
  const params = new URLSearchParams(location.search);

  const showPublish = params.get("publish") === "1";
  const blueprintId = params.get("blueprintId");
  const extensionId = params.get("extensionId");

  useEffect(() => {
    // Both blueprintId & extensionId being set should never happen in practice, but
    // at least one of them needs to be present
    const validShareContext =
      (blueprintId || extensionId) && !(blueprintId && extensionId);

    if (showPublish && validShareContext) {
      dispatch(
        blueprintModalsSlice.actions.setPublishContext({
          ...(blueprintId ? { blueprintId } : {}),
          ...(extensionId ? { extensionId } : {}),
        } as PublishContext)
      );

      // Remove the search params after showing the modal
      history.push("/");
    }
  }, []);
};

export default useShowPublishUrlEffect;
