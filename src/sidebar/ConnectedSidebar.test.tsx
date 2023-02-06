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
import ConnectedSidebar from "@/sidebar/ConnectedSidebar";
import { render } from "@/sidebar/testHelpers";
import { authActions } from "@/auth/authSlice";
import { authStateFactory } from "@/testUtils/factories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { appApi, useGetMeQuery } from "@/services/api";
import { anonAuth } from "@/auth/authConstants";
import { MemoryRouter } from "react-router";
import { type Me } from "@/types/contract";

jest.mock("@/store/optionsStore", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));
jest.mock("@/services/api", () => ({
  useGetMeQuery: jest.fn(),
  appApi: {
    reducerPath: "appApi",
    endpoints: {
      getMe: {
        useQueryState: jest.fn(),
      },
    },
  },
}));
jest.mock("@/auth/token", () => {
  const originalModule = jest.requireActual("@/auth/token");
  return {
    ...originalModule,
    isLinked: jest.fn().mockResolvedValue(true),
  };
});

function mockMeQuery(state: { isLoading: boolean; data?: Me; error?: any }) {
  (appApi.endpoints.getMe.useQueryState as jest.Mock).mockReturnValue(state);
  (useGetMeQuery as jest.Mock).mockReturnValue(state);
}

browser.runtime.getURL = (path: string) =>
  `chrome-extension://example.url/${path}`;

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

describe("SidebarApp", () => {
  test("renders not connected", async () => {
    mockMeQuery({
      isLoading: false,
      data: anonAuth as any,
    });

    const rendered = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>
    );
    await waitForEffect();

    jest.runAllTimers();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders not connected partner view", async () => {
    mockMeQuery({
      isLoading: false,
      data: {
        partner: {},
        ...anonAuth,
      },
    });

    const rendered = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>
    );
    await waitForEffect();

    jest.runAllTimers();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders", async () => {
    mockMeQuery({
      isLoading: false,
      data: authStateFactory(),
    });

    const rendered = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
      {
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
        },
      }
    );

    await waitForEffect();

    jest.runAllTimers();
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
