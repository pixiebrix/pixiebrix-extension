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

import { configureStore } from "@reduxjs/toolkit";
import {
  actions as editorActions,
  editorSlice,
} from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import {
  cloudExtensionFactory,
  extensionPointDefinitionFactory,
} from "@/testUtils/factories";
import { EditorRootState } from "@/pageEditor/pageEditorTypes";
import { ExtensionsRootState } from "@/store/extensionsTypes";
import { selectExtensionAvailability } from "@/pageEditor/slices/editorSelectors";
import { getInstalledExtensionPoints } from "@/contentScript/messenger/api";

const { actions: optionsActions, reducer: extensionsReducer } = extensionsSlice;

describe("checkAvailableInstalledExtensions", () => {
  test("it passes", async () => {
    const store = configureStore<EditorRootState & ExtensionsRootState>({
      reducer: {
        editor: editorSlice.reducer,
        options: extensionsReducer,
      },
    });

    const extensionPoint = extensionPointDefinitionFactory(
      getInstalledExtensionPoints as jest.Mock
    ).store.dispatch(
      optionsActions.installCloudExtension({
        extension: cloudExtensionFactory(),
      })
    );

    await store.dispatch(editorActions.checkAvailableInstalledExtensions());

    const state = store.getState();

    const availability = selectExtensionAvailability(state);

    console.log({ availability });
  });
});
