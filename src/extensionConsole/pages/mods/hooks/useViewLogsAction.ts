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

import { type ModViewItem } from "@/types/modTypes";
import { useDispatch } from "react-redux";
import {
  getLabel,
  isModDefinition,
  mapModComponentToMessageContext,
} from "@/utils/modUtils";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";

function useViewLogsAction(modViewItem: ModViewItem): (() => void) | null {
  const dispatch = useDispatch();
  const { mod, status } = modViewItem;

  const viewLogs = () => {
    dispatch(
      modModalsSlice.actions.setLogsContext({
        title: getLabel(mod),
        messageContext: isModDefinition(mod)
          ? {
              label: getLabel(mod),
              modId: mod.metadata.id,
            }
          : mapModComponentToMessageContext(mod),
      }),
    );
  };

  return status === "Inactive" ? null : viewLogs;
}

export default useViewLogsAction;
