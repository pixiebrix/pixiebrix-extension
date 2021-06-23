/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import { ElementConfig } from "@/devTools/editor/extensionPoints/adapter";
import { useDispatch } from "react-redux";
import { useCallback, useContext } from "react";
import { DevToolsContext } from "@/devTools/context";
import AuthContext from "@/auth/AuthContext";
import { useToasts } from "react-toast-notifications";
import { actions } from "@/devTools/editor/editorSlice";
import { getTabInfo } from "@/background/devtools";
import { generateExtensionPointMetadata } from "@/devTools/editor/extensionPoints/base";
import * as nativeOperations from "@/background/devtools";
import { reportEvent } from "@/telemetry/events";
import { reportError } from "@/telemetry/logging";

type AddElement = (config: ElementConfig) => void;

function useAddElement(reservedNames: string[]): AddElement {
  const dispatch = useDispatch();
  const { port, tabState } = useContext(DevToolsContext);
  const { scope, flags = [] } = useContext(AuthContext);
  const { addToast } = useToasts();

  return useCallback(
    async (config: ElementConfig) => {
      if (config.flag && !flags.includes(config.flag)) {
        dispatch(
          actions.betaError({ error: "This feature is in private beta" })
        );
        return;
      }

      dispatch(actions.toggleInsert(config.elementType));

      try {
        const element = config.insert ? await config.insert(port) : null;
        const { url } = await getTabInfo(port);
        const metadata = await generateExtensionPointMetadata(
          config.label,
          scope,
          url,
          reservedNames
        );
        const initialState = config.makeState(
          url,
          metadata,
          element,
          tabState.meta.frameworks ?? []
        );
        await nativeOperations.updateDynamicElement(
          port,
          config.makeConfig(initialState)
        );
        dispatch(actions.addElement(initialState));
        reportEvent("PageEditorStart", {
          type: config.elementType,
        });
      } catch (error) {
        if (!error.toString().toLowerCase().includes("selection cancelled")) {
          console.error(error);
          reportError(error);
          addToast(
            `Error adding ${config.label.toLowerCase()}: ${error.toString()}`,
            {
              appearance: "error",
              autoDismiss: true,
            }
          );
        }
      } finally {
        dispatch(actions.toggleInsert(null));
      }
    },
    [
      dispatch,
      port,
      tabState.meta?.frameworks,
      reservedNames,
      scope,
      addToast,
      flags,
    ]
  );
}

export default useAddElement;
