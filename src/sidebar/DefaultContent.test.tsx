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
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { extensionFactory } from "@/testUtils/factories";
import DefaultPanel from "./DefaultPanel";
import extensionsSlice from "@/store/extensionsSlice";
import { authSlice } from "@/auth/authSlice";
import { type AuthState } from "@/auth/authTypes";
import { PersistedExtension } from "@/types/extensionTypes";

function optionsStore(initialState?: {
  extensions: PersistedExtension[];
  auth: AuthState;
}) {
  return configureStore({
    reducer: {
      options: extensionsSlice.reducer,
      auth: authSlice.reducer,
    },
    preloadedState: initialState ?? undefined,
  });
}

describe("renders DefaultPanel", () => {
  it("renders Page Editor call to action", () => {
    const state = {
      extensions: [extensionFactory() as PersistedExtension],
      auth: { flags: [] } as AuthState,
    };

    render(
      <Provider store={optionsStore(state)}>
        <DefaultPanel />
      </Provider>
    );

    expect(screen.queryByText("Get started with PixieBrix")).not.toBeNull();
  });

  it("renders restricted user content", () => {
    const state = {
      extensions: [extensionFactory() as PersistedExtension],
      auth: { flags: ["restricted-marketplace"] } as AuthState,
    };

    render(
      <Provider store={optionsStore(state)}>
        <DefaultPanel />
      </Provider>
    );

    expect(
      screen.queryByText("No panels activated for the page")
    ).not.toBeNull();
  });
});
