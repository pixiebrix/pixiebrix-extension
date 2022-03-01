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

import { useCallback } from "react";
import { reportEvent } from "@/telemetry/events";
import { useDispatch } from "react-redux";
import notify from "@/utils/notify";
import { editorSlice, FormState } from "@/devTools/editor/slices/editorSlice";
import { ElementConfig } from "@/devTools/editor/extensionPoints/elementConfig";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { getCurrentURL } from "@/devTools/utils";

const { addElement } = editorSlice.actions;

function useAddExisting<T extends { rawConfig: ExtensionPointConfig }>(
  config: ElementConfig,
  cancel: () => void
): (extensionPoint: { rawConfig: ExtensionPointConfig }) => Promise<void> {
  const dispatch = useDispatch();
  return useCallback(
    async (extensionPoint: T) => {
      try {
        // Cancel out of insert mode
        cancel();

        const url = await getCurrentURL();
        const state = await config.fromExtensionPoint(
          url,
          extensionPoint.rawConfig
        );

        // TODO: report if created new, or using existing foundation
        reportEvent("PageEditorStart", {
          type: config.elementType,
        });

        dispatch(addElement(state as FormState));
      } catch (error) {
        notify.error({ message: `Error adding ${config.label}`, error });
      }
    },
    [config, dispatch, cancel]
  );
}

export default useAddExisting;
