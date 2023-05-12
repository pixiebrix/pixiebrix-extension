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

import React from "react";
import PanelContent from "./PanelContent";
import { render } from "./testHelpers";
import { navigationEvent } from "@/pageEditor/events";
import { tabStateActions } from "@/pageEditor/tabState/tabStateSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { updateDynamicElement } from "@/contentScript/messenger/api";
import { thisTab } from "./utils";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";

// This mock is required because of coupling between useTheme and Options store, which is problematic to mock
// EditorLayout -> Modals -> AddBlockModal -> useGetTheme -> persistor -> @/store/optionsStore
jest.mock("@/pageEditor/EditorLayout", () => ({
  __esModule: true,
  default: () => <div>EditorLayout</div>,
}));

jest.mock("@/contentScript/messenger/api", () => ({
  __esModule: true,
  removeInstalledExtension: jest.fn(),
  updateDynamicElement: jest.fn(),
}));

// In the tests we don't render the PanelContent component, but testing the listeners
// Hence mocking for the topmost component in PanelContent
jest.mock("@/pageEditor/store", () => ({
  __esModule: true,
  persistor: {},
}));

jest.mock("redux-persist/integration/react", () => ({
  __esModule: true,
  PersistGate: () => <div>PanelContent</div>,
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe("Listen to navigationEvent", () => {
  test("no element selected", async () => {
    jest.spyOn(tabStateActions, "connectToContentScript");

    render(<PanelContent />);
    await waitForEffect();
    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(1);

    navigationEvent.emit(thisTab.tabId);

    // One call on load and one on navigation event
    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(2);
    expect(updateDynamicElement).not.toHaveBeenCalled();
  });

  test("an element is selected", async () => {
    jest.spyOn(tabStateActions, "connectToContentScript");

    const formState = formStateFactory();
    render(<PanelContent />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
      },
    });
    await waitForEffect();
    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(1);
    expect(updateDynamicElement).not.toHaveBeenCalled();

    navigationEvent.emit(thisTab.tabId);

    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(2);
    // Panels are not automatically updated on navigation
    expect(updateDynamicElement).toHaveBeenCalledTimes(0);
  });
});
