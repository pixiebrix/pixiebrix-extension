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

import { render, screen } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import React from "react";
import EditorContent from "@/pageEditor/EditorContent";
import { getRunningStarterBricks } from "@/contentScript/messenger/api";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { getCurrentInspectedURL } from "@/pageEditor/context/connection";

jest.mock("@/permissions/modComponentPermissionHelpers", () => ({
  collectModComponentPermissions: jest.fn().mockResolvedValue({}),
}));

// Mock to support hook usage in the subtree, not relevant to UI tests here
jest.mock("@/hooks/useRefreshRegistries");

jest.mock("@/pageEditor/context/connection", () => {
  const actual = jest.requireActual("@/pageEditor/context/connection");
  return {
    ...actual,
    getCurrentInspectedURL: jest.fn(),
  };
});

jest.mock("@/pageEditor/hooks/useCurrentInspectedUrl");

jest.mock("@/contentScript/messenger/api");

describe("error alerting in the UI", () => {
  test("shows error when checkAvailableDraftModComponents fails", async () => {
    const message = "testing error";
    jest.mocked(getCurrentInspectedURL).mockImplementation(() => {
      throw new Error(message);
    });

    const formState = formStateFactory();
    render(<EditorContent />, {
      async setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        await dispatch(editorActions.checkAvailableDraftModComponents());
      },
    });

    await waitForEffect();

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  test("shows error when checkAvailableActivatedModComponents fails", async () => {
    const message = "testing error";
    jest.mocked(getRunningStarterBricks).mockImplementation(() => {
      throw new Error(message);
    });

    const formState = formStateFactory();
    render(<EditorContent />, {
      async setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        await dispatch(editorActions.checkAvailableActivatedModComponents());
      },
    });

    await waitForEffect();

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
