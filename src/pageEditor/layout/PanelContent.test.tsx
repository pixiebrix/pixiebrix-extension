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

import React from "react";
import PanelContent from "./PanelContent";
import { render } from "../testHelpers";
import { navigationEvent } from "@/pageEditor/events";
import { tabStateActions } from "@/pageEditor/tabState/tabStateSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { updateDraftModComponent } from "@/contentScript/messenger/api";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";

jest.mock("@/contentScript/messenger/api");

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

    navigationEvent.emit();

    // One call on load and one on navigation event
    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(2);
    expect(updateDraftModComponent).not.toHaveBeenCalled();
  });

  test("an element is selected", async () => {
    jest.spyOn(tabStateActions, "connectToContentScript");

    const formState = formStateFactory();
    render(<PanelContent />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
      },
    });
    await waitForEffect();
    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(1);
    expect(updateDraftModComponent).not.toHaveBeenCalled();

    navigationEvent.emit();

    expect(tabStateActions.connectToContentScript).toHaveBeenCalledTimes(2);
    // Panels are not automatically updated on navigation
    expect(updateDraftModComponent).toHaveBeenCalledTimes(0);
  });
});
