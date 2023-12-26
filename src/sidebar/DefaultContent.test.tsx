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
import { render, screen } from "@/sidebar/testHelpers";
import DefaultPanel from "./DefaultPanel";
import extensionsSlice from "@/store/extensionsSlice";
import { authSlice } from "@/auth/authSlice";
import { type AuthState } from "@/auth/authTypes";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";

describe("renders DefaultPanel", () => {
  it("renders Page Editor call to action", () => {
    render(<DefaultPanel />);

    expect(screen.getByText("Get started with PixieBrix")).not.toBeNull();
  });

  it("renders restricted user content", () => {
    render(<DefaultPanel />, {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.saveModComponent({
            modComponent: modComponentFactory() as ActivatedModComponent,
            pushToCloud: false,
          }),
        );

        dispatch(
          authSlice.actions.setAuth({
            flags: ["restricted-marketplace"],
          } as AuthState),
        );
      },
    });

    expect(screen.getByText("No panels activated for the page")).not.toBeNull();
  });
});
