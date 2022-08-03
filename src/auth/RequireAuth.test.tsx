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
import RequireAuth from "@/auth/RequireAuth";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { useGetMeQuery } from "@/services/api";
import { Provider } from "react-redux";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import servicesSlice, { persistServicesConfig } from "@/store/servicesSlice";
import { MemoryRouter } from "react-router";
import settingsSlice from "@/store/settingsSlice";

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      services: persistReducer(persistServicesConfig, servicesSlice.reducer),
      settings: settingsSlice.reducer,
    },
    preloadedState: initialState,
  });
}

jest.mock("@/services/api", () => ({
  useGetMeQuery: jest.fn(),
}));

const MockLoginPage: React.VFC = () => <div>Login</div>;

describe("RequireAuth", () => {
  test("authenticated user", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
    }));

    render(
      <Provider store={optionsStore({ auth: { isLoggedIn: true } })}>
        <MemoryRouter>
          <RequireAuth LoginPage={MockLoginPage}>
            Only authenticated users should see me!
          </RequireAuth>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.queryByTestId("loader")).toBeNull();
    expect(
      screen.getByText("Only authenticated users should see me!")
    ).not.toBeNull();
  });

  test("unauthenticated user", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      error: { response: { status: 401 } },
    }));

    render(
      <Provider store={optionsStore({ auth: { isLoggedIn: true } })}>
        <MemoryRouter>
          <RequireAuth LoginPage={MockLoginPage}>
            Only authenticated users should see me!
          </RequireAuth>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.queryByTestId("loader")).toBeNull();
    expect(screen.getByText("Login")).not.toBeNull();
    expect(
      screen.queryByText("Only authenticated users should see me!")
    ).toBeNull();
  });

  test("loading state does not flash content", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: true,
    }));

    render(
      <Provider store={optionsStore()}>
        <MemoryRouter>
          <RequireAuth LoginPage={MockLoginPage}>
            Only authenticated users should see me!
          </RequireAuth>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId("loader")).not.toBeNull();
    expect(
      screen.queryByText("Only authenticated users should see me!")
    ).toBeNull();
  });
});
