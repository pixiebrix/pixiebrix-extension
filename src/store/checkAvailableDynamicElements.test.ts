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

import { configureStore } from "@reduxjs/toolkit";
import { type EditorRootState } from "@/pageEditor/pageEditorTypes";
import { actions, editorSlice } from "@/pageEditor/slices/editorSlice";
import { menuItemFormStateFactory } from "@/testUtils/factories";
import { type RegistryId } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { selectExtensionAvailability } from "@/pageEditor/slices/editorSelectors";
import { getCurrentURL } from "@/pageEditor/utils";
import { checkAvailable } from "@/contentScript/messenger/api";
import { checkAvailable as backgroundCheckAvailable } from "@/blocks/available";
import { type Target } from "@/types";
import { type PageTarget } from "webext-messenger";
import { type Availability } from "@/blocks/types";
import { type ExtensionsRootState } from "@/store/extensionsTypes";
import extensionsSlice from "@/store/extensionsSlice";

jest.mock("@/contentScript/messenger/api", () => ({
  checkAvailable: jest.fn(),
}));

jest.mock("@/pageEditor/utils", () => ({
  getCurrentURL: jest.fn(),
}));

const { reducer: extensionsReducer } = extensionsSlice;

describe("checkAvailableDynamicElements", () => {
  test("it checks dynamic elements correctly", async () => {
    const testUrl = "https://www.myUrl.com/*";
    (getCurrentURL as jest.Mock).mockResolvedValue(testUrl);

    const store = configureStore<EditorRootState & ExtensionsRootState>({
      reducer: {
        editor: editorSlice.reducer,
        options: extensionsReducer,
      },
    });

    const availableDynamicExtension = menuItemFormStateFactory({
      extensionPoint: {
        metadata: {
          id: validateRegistryId("test/available-button"),
          name: "Test Extension Point 1",
        },
        definition: {
          type: "menuItem",
          reader: [] as RegistryId[],
          isAvailable: {
            matchPatterns: [testUrl],
          },
          containerSelector: "",
          template: "",
        },
      },
    });

    const unavailableDynamicExtension = menuItemFormStateFactory({
      extensionPoint: {
        metadata: {
          id: validateRegistryId("test/unavailable-button"),
          name: "Test Extension Point 2",
        },
        definition: {
          type: "menuItem",
          reader: [] as RegistryId[],
          isAvailable: {
            matchPatterns: ["https://www.otherUrl.com/"],
          },
          containerSelector: "",
          template: "",
        },
      },
    });

    store.dispatch(actions.addElement(unavailableDynamicExtension));
    store.dispatch(actions.selectInstalled(availableDynamicExtension));

    (checkAvailable as jest.Mock).mockImplementation(
      async (
        target: Target | PageTarget,
        availability: Availability,
        url: string
      ) => backgroundCheckAvailable(availability, url)
    );

    await store.dispatch(actions.checkAvailableDynamicElements());
    await store.dispatch(actions.checkAvailableInstalledExtensions());

    const state = store.getState();

    const { availableDynamicIds, unavailableDynamicCount } =
      selectExtensionAvailability(state);

    expect(availableDynamicIds).toStrictEqual([availableDynamicExtension.uuid]);
    expect(unavailableDynamicCount).toStrictEqual(1);
  });
});
