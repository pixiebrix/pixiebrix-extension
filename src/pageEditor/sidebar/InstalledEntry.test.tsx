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
import { waitForEffect } from "@/testUtils/testHelpers";
import { render } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { authActions } from "@/auth/authSlice";
import InstalledEntry from "@/pageEditor/sidebar/InstalledEntry";
import { extensionFactory } from "@/testUtils/factories/extensionFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { authStateFactory } from "@/testUtils/factories/authFactories";

jest.mock("@/pageEditor/extensionPoints/adapter", () => {
  const actual = jest.requireActual("@/pageEditor/extensionPoints/adapter");
  return {
    ...actual,
    selectType: jest.fn().mockResolvedValue("menuItem"),
  };
});

beforeAll(() => {
  // When a FontAwesomeIcon gets a title, it generates a random id, which breaks the snapshot.
  jest.spyOn(global.Math, "random").mockImplementation(() => 0);
});

afterAll(() => {
  jest.clearAllMocks();
});

describe("InstalledEntry", () => {
  test("it renders not active element", async () => {
    const extension = extensionFactory();
    const formState = formStateFactory();
    const rendered = render(
      <InstalledEntry extension={extension} recipes={[]} isAvailable />,
      {
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
      }
    );
    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders active element", async () => {
    const extension = extensionFactory();
    const formState = formStateFactory();
    const rendered = render(
      <InstalledEntry extension={extension} recipes={[]} isAvailable />,
      {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
          // The addElement also sets the active element
          dispatch(editorActions.addElement(formState));
        },
      }
    );
    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
