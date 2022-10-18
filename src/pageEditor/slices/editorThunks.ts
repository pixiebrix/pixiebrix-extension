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

import { createAsyncThunk } from "@reduxjs/toolkit";
import { EditorRootState } from "@/pageEditor/pageEditorTypes";
import { produce } from "immer";
import {
  selectActiveElement,
  selectNotDeletedElements,
  selectNotDeletedExtensions,
} from "@/pageEditor/slices/editorSelectors";
import { uuidv4 } from "@/types/helpers";
import { normalizePipelineForEditor } from "@/pageEditor/extensionPoints/pipelineMapping";
import { actions } from "@/pageEditor/slices/editorSlice";
import { UUID } from "@/core";
import { ExtensionsRootState } from "@/store/extensionsTypes";
import {
  checkAvailable,
  getInstalledExtensionPoints,
} from "@/contentScript/messenger/api";
import { getCurrentURL, thisTab } from "@/pageEditor/utils";
import { resolveDefinitions } from "@/registry/internal";
import { QuickBarExtensionPoint } from "@/extensionPoints/quickBarExtension";
import { testMatchPatterns } from "@/blocks/available";
import { BaseExtensionPointState } from "@/pageEditor/extensionPoints/elementConfig";
import { isQuickBarExtensionPoint } from "@/pageEditor/extensionPoints/formStateTypes";
import { compact, uniq } from "lodash";

export const cloneActiveExtension = createAsyncThunk<
  void,
  void,
  { state: EditorRootState }
>("editor/cloneActiveExtension", async (arg, thunkAPI) => {
  const state = thunkAPI.getState();
  const newElement = await produce(
    selectActiveElement(state),
    async (draft) => {
      draft.uuid = uuidv4();
      draft.label += " - copy";
      // Remove from its recipe, if any (the user can add it to any recipe after creation)
      delete draft.recipe;
      // Re-generate instance IDs for all the bricks in the extension
      draft.extension.blockPipeline = await normalizePipelineForEditor(
        draft.extension.blockPipeline
      );
    }
  );
  // Add the cloned extension
  thunkAPI.dispatch(actions.addElement(newElement));
});

export type AvailableInstalled = {
  availableInstalledIds: UUID[];
  unavailableCount: number;
};

export const checkAvailableInstalledExtensions = createAsyncThunk<
  AvailableInstalled,
  void,
  { state: EditorRootState & ExtensionsRootState }
>("editor/checkAvailableInstalledExtensions", async (arg, thunkAPI) => {
  const extensions = selectNotDeletedExtensions(thunkAPI.getState());
  const extensionPoints = await getInstalledExtensionPoints(thisTab);
  const installedExtensionPoints = new Map(
    extensionPoints.map((extensionPoint) => [extensionPoint.id, extensionPoint])
  );
  const resolved = await Promise.all(
    extensions.map(async (extension) => resolveDefinitions(extension))
  );
  const tabUrl = await getCurrentURL();
  const availableExtensionPointIds = resolved
    .filter((x) => {
      const extensionPoint = installedExtensionPoints.get(x.extensionPointId);
      // Not installed means not available
      if (extensionPoint == null) {
        return false;
      }

      // QuickBar is installed on every page, need to filter by the documentUrlPatterns
      if (QuickBarExtensionPoint.isQuickBarExtensionPoint(extensionPoint)) {
        return testMatchPatterns(extensionPoint.documentUrlPatterns, tabUrl);
      }

      return true;
    })
    .map((x) => x.id);

  const availableInstalledIds = extensions
    .filter((x) => availableExtensionPointIds.includes(x.id))
    .map((x) => x.id);
  const unavailableCount = extensions.length - availableInstalledIds.length;

  return { availableInstalledIds, unavailableCount };
});

async function isElementAvailable(
  tabUrl: string,
  elementExtensionPoint: BaseExtensionPointState
): Promise<boolean> {
  if (isQuickBarExtensionPoint(elementExtensionPoint)) {
    return testMatchPatterns(
      elementExtensionPoint.definition.documentUrlPatterns,
      tabUrl
    );
  }

  return checkAvailable(
    thisTab,
    elementExtensionPoint.definition.isAvailable,
    tabUrl
  );
}

export type AvailableDynamic = {
  availableDynamicIds: UUID[];
  unavailableCount: number;
};

export const checkAvailableDynamicElements = createAsyncThunk<
  AvailableDynamic,
  void,
  { state: EditorRootState }
>("editor/checkAvailableDynamicElements", async (arg, thunkAPI) => {
  const elements = selectNotDeletedElements(thunkAPI.getState());
  const tabUrl = await getCurrentURL();
  const availableElementIds = await Promise.all(
    elements.map(async ({ uuid, extensionPoint: elementExtensionPoint }) => {
      const isAvailable = await isElementAvailable(
        tabUrl,
        elementExtensionPoint
      );

      return isAvailable ? uuid : null;
    })
  );

  const availableDynamicIds = uniq(compact(availableElementIds));
  const unavailableCount = elements.length - availableDynamicIds.length;

  return { availableDynamicIds, unavailableCount };
});

export const checkActiveElementAvailability = createAsyncThunk<
  { isAvailable: boolean },
  void,
  { state: EditorRootState }
>("editor/checkDynamicElementAvailability", async (arg, thunkAPI) => {
  const tabUrl = await getCurrentURL();
  const element = selectActiveElement(thunkAPI.getState());
  const isAvailable = await isElementAvailable(tabUrl, element.extensionPoint);
  return { isAvailable };
});
