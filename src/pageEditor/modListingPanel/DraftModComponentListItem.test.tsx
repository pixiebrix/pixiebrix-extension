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
import { render } from "@/pageEditor/testHelpers";
import DraftModComponentListItem from "@/pageEditor/modListingPanel/DraftModComponentListItem";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { authActions } from "@/auth/authSlice";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { authStateFactory } from "@/testUtils/factories/authFactories";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useAllModDefinitions: jest
    .fn()
    .mockReturnValue({ data: [], isLoading: false }),
}));

beforeAll(() => {
  // When a FontAwesomeIcon gets a title, it generates a random id, which breaks the snapshot.
  jest.spyOn(global.Math, "random").mockImplementation(() => 0);
});

afterAll(() => {
  jest.clearAllMocks();
});

describe("DraftModComponentListItem", () => {
  beforeEach(() => {
    // :barf: these Jest snapshots contain sequence UUIDs
    formStateFactory.resetSequence();
  });

  it("renders not active element", () => {
    const formState = formStateFactory();
    expect(
      render(
        <DraftModComponentListItem
          modComponentFormState={formState}
          isAvailable
        />,
        {
          initialValues: formState,
          setupRedux(dispatch) {
            dispatch(authActions.setAuth(authStateFactory()));
            // The addElement also sets the active element
            dispatch(
              editorActions.addModComponentFormState(formStateFactory()),
            );

            // Add new element to deactivate the previous one
            dispatch(editorActions.addModComponentFormState(formState));
            // Remove the active element and stay with one inactive item
            dispatch(
              editorActions.markModComponentFormStateAsDeleted(formState.uuid),
            );
          },
        },
      ).asFragment(),
    ).toMatchSnapshot();
  });

  it("renders active element", () => {
    const formState = formStateFactory();
    expect(
      render(
        <DraftModComponentListItem
          modComponentFormState={formState}
          isAvailable
        />,
        {
          initialValues: formState,
          setupRedux(dispatch) {
            dispatch(authActions.setAuth(authStateFactory()));
            // The addElement also sets the active element
            dispatch(editorActions.addModComponentFormState(formState));
          },
        },
      ).asFragment(),
    ).toMatchSnapshot();
  });
});
