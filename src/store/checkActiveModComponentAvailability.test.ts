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

import { configureStore } from "@reduxjs/toolkit";
import { type EditorRootState } from "@/pageEditor/pageEditorTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { actions, editorSlice } from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { validateRegistryId } from "@/types/helpers";
import { type RegistryId } from "@/types/registryTypes";
import { checkAvailable } from "@/contentScript/messenger/api";
import { type Target } from "@/types/messengerTypes";
import { type PageTarget } from "webext-messenger";
import {
  checkAvailable as backgroundCheckAvailable,
  normalizeAvailability,
} from "@/bricks/available";
import { selectModComponentAvailability } from "@/pageEditor/slices/editorSelectors";
import { produce } from "immer";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { getCurrentInspectedURL } from "@/pageEditor/context/connection";
import { type Availability } from "@/types/availabilityTypes";

jest.mock("@/contentScript/messenger/api");
jest.mock("@/pageEditor/context/connection");

const { reducer: extensionsReducer } = extensionsSlice;

describe("checkActiveModComponentAvailability", () => {
  test("it checks the active element correctly", async () => {
    const testUrl = "https://www.myUrl.com/*";
    jest.mocked(getCurrentInspectedURL).mockResolvedValue(testUrl);

    const store = configureStore<EditorRootState & ModComponentsRootState>({
      reducer: {
        editor: editorSlice.reducer,
        options: extensionsReducer,
      },
    });

    const availableDraftModComponent = menuItemFormStateFactory({
      extensionPoint: {
        metadata: {
          id: validateRegistryId("test/available-button"),
          name: "Test Starter Brick 1",
        },
        definition: {
          type: "menuItem",
          reader: [] as RegistryId[],
          isAvailable: normalizeAvailability({
            matchPatterns: ["https://www.otherUrl.com/"],
          }),
          containerSelector: "",
          template: "",
        },
      },
    });

    const unavailableDraftModComponent = menuItemFormStateFactory({
      extensionPoint: {
        metadata: {
          id: validateRegistryId("test/unavailable-button"),
          name: "Test Starter Brick 2",
        },
        definition: {
          type: "menuItem",
          reader: [] as RegistryId[],
          isAvailable: normalizeAvailability({
            matchPatterns: ["https://www.otherUrl.com/"],
          }),
          containerSelector: "",
          template: "",
        },
      },
    });

    store.dispatch(
      actions.addModComponentFormState(unavailableDraftModComponent),
    );
    store.dispatch(actions.selectInstalled(availableDraftModComponent));

    jest
      .mocked(checkAvailable)
      .mockImplementation(
        async (
          target: Target | PageTarget,
          availability: Availability,
          url: string,
        ) => backgroundCheckAvailable(availability, url),
      );

    await store.dispatch(actions.checkAvailableDraftModComponents());
    await store.dispatch(actions.checkAvailableInstalledExtensions());

    const state1 = store.getState();

    const availability1 = selectModComponentAvailability(state1);

    // Check both are unavailable
    expect(availability1.availableDraftModComponentIds).toBeEmpty();

    // Make mod component form state available
    const available = produce(availableDraftModComponent, (draft) => {
      draft.extensionPoint.definition.isAvailable.matchPatterns = [testUrl];
    });
    store.dispatch(actions.syncModComponentFormState(available));

    await store.dispatch(actions.checkActiveModComponentAvailability());

    const state2 = store.getState();

    const availability2 = selectModComponentAvailability(state2);

    // Check that one is available now
    expect(availability2.availableDraftModComponentIds).toStrictEqual([
      availableDraftModComponent.uuid,
    ]);
  });
});
