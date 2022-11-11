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

import React from "react";
import { authStateFactory, formStateFactory } from "@/testUtils/factories";
import { render } from "@/pageEditor/testHelpers";
import DynamicEntry from "@/pageEditor/sidebar/DynamicEntry";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { authActions } from "@/auth/authSlice";

jest.mock("@/recipes/recipesHooks", () => ({
  useAllRecipes: jest.fn().mockReturnValue({ data: [], isLoading: false }),
}));

beforeAll(() => {
  // When a FontAwesomeIcon gets a title, it generates a random id, which breaks the snapshot.
  jest.spyOn(global.Math, "random").mockImplementation(() => 0);
});

afterAll(() => {
  jest.clearAllMocks();
});

describe("DynamicEntry", () => {
  test("it renders not active element", () => {
    const formState = formStateFactory();
    expect(
      render(<DynamicEntry extension={formState} isAvailable />, {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
          // The addElement also sets the active element
          dispatch(editorActions.addElement(formStateFactory()));

          // Add new element to deactivate the previous one
          dispatch(editorActions.addElement(formState));
          // Remove the active element and stay with one inactive item
          dispatch(editorActions.removeElement(formState.uuid));
        },
      }).asFragment()
    ).toMatchSnapshot();
  });

  test("it renders active element", () => {
    const formState = formStateFactory();
    expect(
      render(<DynamicEntry extension={formState} isAvailable />, {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
          // The addElement also sets the active element
          dispatch(editorActions.addElement(formState));
        },
      }).asFragment()
    ).toMatchSnapshot();
  });
});
