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
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { extensionFactory } from "@/tests/factories";
import { ExtensionOptionsState } from "@/store/extensionsTypes";
import { PersistedExtension } from "@/core";
import DefaultPanel from "./DefaultPanel";
import extensionsSlice from "@/store/extensionsSlice";

jest.unmock("react-redux");

function optionsStore(initialState?: ExtensionOptionsState) {
  return configureStore({
    reducer: { options: extensionsSlice.reducer },
    preloadedState: initialState ? { options: initialState } : undefined,
  });
}

describe("renders DefaultPanel", () => {
  it("renders no active extensions", () => {
    render(
      <Provider store={optionsStore()}>
        <DefaultPanel />
      </Provider>
    );

    expect(screen.queryByText("Activate an Official Blueprint")).not.toBeNull();
  });

  it("renders no available extensions", () => {
    const state: ExtensionOptionsState = {
      extensions: [extensionFactory() as PersistedExtension],
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
