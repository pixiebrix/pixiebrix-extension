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
import RequireAuth from "@/auth/RequireAuth";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { appApi, useGetMeQuery } from "@/services/api";
import { Provider } from "react-redux";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import servicesSlice, { persistServicesConfig } from "@/store/servicesSlice";
import settingsSlice from "@/store/settingsSlice";
import { type Me } from "@/types/contract";

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
  appApi: {
    endpoints: {
      getMe: {
        useQueryState: jest.fn(),
      },
    },
  },
}));

function mockMeQuery(state: { isLoading: boolean; data?: Me; error?: any }) {
  (appApi.endpoints.getMe.useQueryState as jest.Mock).mockReturnValue(state);
  (useGetMeQuery as jest.Mock).mockReturnValue(state);
}

const MockLoginPage: React.VFC = () => <div>Login</div>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RequireAuth", () => {
  test("authenticated user", () => {
    mockMeQuery({
      isLoading: false,
    });

    render(
      <Provider store={optionsStore({ auth: { isLoggedIn: true } })}>
        <RequireAuth LoginPage={MockLoginPage}>
          Only authenticated users should see me!
        </RequireAuth>
      </Provider>
    );

    expect(screen.queryByTestId("loader")).toBeNull();
    expect(
      screen.getByText("Only authenticated users should see me!")
    ).not.toBeNull();
  });

  test("unauthenticated user", () => {
    mockMeQuery({
      isLoading: false,
      error: { response: { status: 401 } },
    });

    render(
      <Provider store={optionsStore({ auth: { isLoggedIn: true } })}>
        <RequireAuth LoginPage={MockLoginPage}>
          Only authenticated users should see me!
        </RequireAuth>
      </Provider>
    );

    expect(screen.queryByTestId("loader")).toBeNull();
    expect(screen.getByText("Login")).not.toBeNull();
    expect(
      screen.queryByText("Only authenticated users should see me!")
    ).toBeNull();
  });

  test("loading state does not flash content", () => {
    // FIXME: this is not a real internal state the app can be in. In order for the meQuery to be loading,
    //  they must have a token, which implies there is a cached user in the auth state.
    mockMeQuery({
      isLoading: true,
    });

    render(
      <Provider store={optionsStore()}>
        <RequireAuth LoginPage={MockLoginPage}>
          Only authenticated users should see me!
        </RequireAuth>
      </Provider>
    );

    expect(screen.getByTestId("loader")).not.toBeNull();
    expect(
      screen.queryByText("Only authenticated users should see me!")
    ).toBeNull();
  });
});
