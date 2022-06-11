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
import SetupPage from "@/options/pages/onboarding/SetupPage";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import servicesSlice, { persistServicesConfig } from "@/store/servicesSlice";
import { Provider } from "react-redux";
import { useGetMeQuery } from "@/services/api";

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      services: persistReducer(persistServicesConfig, servicesSlice.reducer),
    },
    preloadedState: initialState,
  });
}

jest.mock("@/services/api", () => ({
  useGetMeQuery: jest.fn(),
}));

jest.mock("@/options/store", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

describe("SetupPage", () => {
  test("typical user", async () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      partner: null,
    }));

    render(
      <Provider store={optionsStore()}>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.queryByText("Connect your AARI account")).toBeNull();
  });

  test("partner user", async () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: {
        partner: {
          id: "",
          name: "Test Partner",
          theme: "automation-anywhere",
        },
      },
    }));

    render(
      <Provider store={optionsStore()}>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.getByText("Connect your AARI account")).not.toBeNull();
  });
});
