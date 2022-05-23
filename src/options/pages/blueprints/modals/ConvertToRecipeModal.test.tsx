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

import { anonAuth } from "@/auth/authConstants";
import { authSlice } from "@/auth/authSlice";
import { render } from "@/options/testHelpers";
import extensionsSlice from "@/store/extensionsSlice";
import { cloudExtensionFactory } from "@/testUtils/factories";
import React from "react";
import { blueprintModalsSlice } from "./blueprintModalsSlice";
import ConvertToRecipeModal from "./ConvertToRecipeModal";

describe("it renders", () => {
  test("default state", () => {
    const extension = cloudExtensionFactory();

    const rendered = render(<ConvertToRecipeModal />, {
      setupRedux(dispatch) {
        dispatch(
          authSlice.actions.setAuth({
            ...anonAuth,
            scope: "@test",
          })
        );
        dispatch(
          extensionsSlice.actions.installCloudExtension({
            extension,
          })
        );
        dispatch(
          blueprintModalsSlice.actions.setShareContext({
            extensionId: extension.id,
          })
        );
      },
    });

    const dialogRoot = rendered.getByRole("dialog");
    expect(dialogRoot).toMatchSnapshot();
  });

  test("requires user scope", async () => {
    const extension = cloudExtensionFactory();

    const rendered = render(<ConvertToRecipeModal />, {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(anonAuth));
        dispatch(
          extensionsSlice.actions.installCloudExtension({
            extension,
          })
        );
        dispatch(
          blueprintModalsSlice.actions.setShareContext({
            extensionId: extension.id,
          })
        );
      },
    });

    // Scope input field is on the screen
    const scopeInput = await rendered.findAllByLabelText("Account Alias");
    expect(scopeInput).not.toBeNull();

    // Screen matches the snapshot
    const dialogRoot = rendered.getByRole("dialog");
    expect(dialogRoot).toMatchSnapshot();
  });
});
