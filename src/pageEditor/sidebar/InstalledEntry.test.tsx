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
import {
  authStateFactory,
  extensionFactory,
  formStateFactory,
} from "@/testUtils/factories";
import { render, waitForEffect } from "@/testUtils/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { authActions } from "@/auth/authSlice";
import InstalledEntry from "@/pageEditor/sidebar/InstalledEntry";

jest.mock("@/pageEditor/extensionPoints/adapter", () => {
  const actual = jest.requireActual("@/pageEditor/extensionPoints/adapter");
  return {
    ...actual,
    selectType: jest.fn().mockResolvedValue("menuItem"),
  };
});

describe("InstalledEntry", () => {
  test("it renders with active element", async () => {
    const extension = extensionFactory();
    const formState = formStateFactory();
    const rendered = render(
      <InstalledEntry
        extension={extension}
        recipes={[]}
        active={false}
        available={true}
      />,
      {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
          dispatch(editorActions.addElement(formState));
          dispatch(editorActions.selectElement(formState.uuid));
        },
      }
    );
    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
