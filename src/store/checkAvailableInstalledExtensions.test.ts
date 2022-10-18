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
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import {
  cloudExtensionFactory,
  menuItemExtensionPointFactory,
  quickBarExtensionPointFactory,
} from "@/testUtils/factories";
import { EditorRootState } from "@/pageEditor/pageEditorTypes";
import { ExtensionsRootState } from "@/store/extensionsTypes";
import { selectExtensionAvailability } from "@/pageEditor/slices/editorSelectors";
import { getInstalledExtensionPoints } from "@/contentScript/messenger/api";
import { getCurrentURL } from "@/pageEditor/utils";
import { checkAvailableInstalledExtensions } from "@/pageEditor/slices/editorThunks";
import { validateRegistryId } from "@/types/helpers";

jest.mock("@/contentScript/messenger/api", () => ({
  getInstalledExtensionPoints: jest.fn(),
}));

jest.mock("@/pageEditor/utils", () => ({
  getCurrentURL: jest.fn(),
}));

const { actions: optionsActions, reducer: extensionsReducer } = extensionsSlice;

describe("checkAvailableInstalledExtensions", () => {
  test("it checks installed extensions correctly", async () => {
    const testUrl = "https://www.myUrl.com/*";
    (getCurrentURL as jest.Mock).mockResolvedValue(testUrl);

    const availableButtonId = validateRegistryId("test/available-button");
    const availableButton = cloudExtensionFactory({
      extensionPointId: availableButtonId,
    });
    const unavailableButtonId = validateRegistryId("test/unavailable-button");
    const unavailableButton = cloudExtensionFactory({
      extensionPointId: unavailableButtonId,
    });
    const availableQbId = validateRegistryId("test/available-quickbar");
    const availableQb = cloudExtensionFactory({
      extensionPointId: availableQbId,
    });
    const unavailableQbId = validateRegistryId("test/unavailable-quickbar");
    const unavailableQb = cloudExtensionFactory({
      extensionPointId: unavailableQbId,
    });

    const availableButtonExtensionPoint = menuItemExtensionPointFactory({
      // @ts-expect-error -- Not sure what's wrong here, possibly TS struggling with the generics?
      extensions: [availableButton],
      id: availableButtonId,
      permissions: {
        origins: [testUrl],
        permissions: ["tabs", "webNavigation"],
      },
      _definition: {
        isAvailable: {
          matchPatterns: [testUrl],
        },
      },
    });
    const availableQuickbarExtensionPoint = quickBarExtensionPointFactory({
      // @ts-expect-error -- Not sure what's wrong here, possibly TS struggling with the generics?
      extensions: [availableQb],
      id: availableQbId,
      documentUrlPatterns: [testUrl],
      permissions: {
        origins: [testUrl],
      },
      _definition: {
        documentUrlPatterns: [testUrl],
        isAvailable: {
          matchPatterns: [testUrl],
        },
      },
    });
    (getInstalledExtensionPoints as jest.Mock).mockResolvedValue([
      availableButtonExtensionPoint,
      availableQuickbarExtensionPoint,
    ]);

    const store = configureStore<EditorRootState & ExtensionsRootState>({
      reducer: {
        editor: editorSlice.reducer,
        options: extensionsReducer,
      },
    });

    store.dispatch(
      optionsActions.installCloudExtension({ extension: availableButton })
    );
    store.dispatch(
      optionsActions.installCloudExtension({ extension: unavailableButton })
    );
    store.dispatch(
      optionsActions.installCloudExtension({ extension: availableQb })
    );
    store.dispatch(
      optionsActions.installCloudExtension({ extension: unavailableQb })
    );

    await store.dispatch(checkAvailableInstalledExtensions());

    const state = store.getState();

    const { availableInstalledIds, unavailableInstalledCount } =
      selectExtensionAvailability(state);

    expect(availableInstalledIds).toStrictEqual([
      availableButton.id,
      availableQb.id,
    ]);
    expect(unavailableInstalledCount).toStrictEqual(2);
  });
});
