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
import SetupPage from "@/extensionConsole/pages/onboarding/SetupPage";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import servicesSlice, { persistServicesConfig } from "@/store/servicesSlice";
import { Provider } from "react-redux";
import { appApi } from "@/services/api";
import settingsSlice from "@/store/settingsSlice";
import { CONTROL_ROOM_OAUTH_SERVICE_ID } from "@/services/constants";
import { uuidv4 } from "@/types/helpers";
import { HashRouter } from "react-router-dom";
import { createHashHistory } from "history";
import userEvent from "@testing-library/user-event";
import { waitForEffect } from "@/testUtils/testHelpers";
import { type Me } from "@/types/contract";
import { INTERNAL_reset as resetManagedStorage } from "@/store/enterprise/managedStorage";

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

jest.mock("lodash", () => {
  const lodash = jest.requireActual("lodash");
  return {
    ...lodash,
    // Handle multiple calls to managedStorage:initManagedStorage across tests
    once: (fn: any) => fn,
  };
});

// `pMemoize` has problems when used in tests because the promise can leak across tests. pMemoizeClear doesn't work
// because the promise hasn't resolved yet
jest.mock("p-memoize", () => {
  const memoize = jest.requireActual("p-memoize");
  return {
    ...memoize,
    __esModule: true,
    pMemoizeClear: jest.fn(),
    default: jest.fn().mockImplementation((fn) => fn),
  };
});

jest.mock("@/services/api", () => ({
  util: {
    resetApiState: jest.fn().mockReturnValue({ type: "notarealreset" }),
  },
  appApi: {
    endpoints: {
      getMe: {
        useQueryState: jest.fn(() => ({
          data: {},
          isLoading: false,
        })),
      },
    },
  },
}));
jest.mock("@/services/baseService", () => ({
  getInstallURL: jest.fn().mockResolvedValue("https://app.pixiebrix.com"),
}));

jest.mock("@/store/optionsStore", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

jest.mock("@/utils/permissions", () => ({
  requestPermissions: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/permissions", () => ({
  serviceOriginPermissions: jest.fn().mockResolvedValue({ origins: [] }),
}));

function mockMeQuery(state: { isLoading: boolean; data?: Me; error?: any }) {
  (appApi.endpoints.getMe.useQueryState as jest.Mock).mockReturnValue(state);
}

beforeEach(async () => {
  jest.clearAllMocks();
  resetManagedStorage();
  await browser.storage.managed.clear();
});

describe("SetupPage", () => {
  test("typical user", async () => {
    mockMeQuery({
      isLoading: false,
      partner: null,
    } as any);

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

  test("OAuth2 partner user", async () => {
    mockMeQuery({
      isLoading: false,
      data: {
        partner: {
          id: uuidv4(),
          name: "Test Partner",
          theme: "automation-anywhere",
        },
      } as any,
    });

    render(
      <Provider
        store={optionsStore({
          settings: { authServiceId: CONTROL_ROOM_OAUTH_SERVICE_ID },
        })}
      >
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

  test("Start URL for OAuth2 flow", async () => {
    const user = userEvent.setup();

    // User will be unauthenticated
    mockMeQuery({
      isLoading: false,
      data: {} as any,
    });

    location.href =
      "chrome-extension://abc123/options.html#/start?hostname=mycontrolroom.com";

    // Needs to use HashRouter instead of MemoryRouter for the useLocation calls in the components to work correctly
    // given the URL structure above
    render(
      <Provider store={optionsStore({})}>
        <HashRouter>
          <SetupPage />
        </HashRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.getByText("Connect your AARI account")).not.toBeNull();
    expect(
      screen.getByLabelText("Control Room URL").getAttribute("value")
      // Schema get pre-pended automatically
    ).toStrictEqual("https://mycontrolroom.com");

    // Sanity check we haven't redirected away from the start page yet
    expect(location.href).toStrictEqual(
      "chrome-extension://abc123/options.html#/start?hostname=mycontrolroom.com"
    );

    const button = screen.getByText("Connect AARI");
    await user.click(button);

    await waitForEffect();

    // Should have redirected away from the start page
    expect(location.href).toStrictEqual(
      "chrome-extension://abc123/options.html#/"
    );
  });

  test("Start URL with Community Edition hostname if user is unauthenticated", async () => {
    // User is authenticated
    mockMeQuery({
      isLoading: false,
      data: {} as any,
    });

    const history = createHashHistory();
    // Hostname comes as hostname, not URL
    history.push(
      "/start?hostname=community2.cloud-2.automationanywhere.digital"
    );

    // Needs to use HashRouter instead of MemoryRouter for the useLocation calls in the components to work correctly
    // given the URL structure above
    render(
      <Provider store={optionsStore({})}>
        <HashRouter>
          <SetupPage />
        </HashRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.getByTestId("link-account-btn")).not.toBeNull();
    expect(screen.queryByTestId("connect-aari-btn")).toBeNull();
  });

  test("Start URL with Community Edition hostname if authenticated", async () => {
    // User is authenticated
    mockMeQuery({
      isLoading: false,
      data: {
        id: uuidv4(),
        partner: {
          id: uuidv4(),
          theme: "automation-anywhere",
        },
      } as any,
    });

    const history = createHashHistory();
    // Hostname comes as hostname, not URL
    history.push(
      "/start?hostname=community2.cloud-2.automationanywhere.digital"
    );

    // Needs to use HashRouter instead of MemoryRouter for the useLocation calls in the components to work correctly
    // given the URL structure above
    render(
      <Provider store={optionsStore({})}>
        <HashRouter>
          <SetupPage />
        </HashRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.queryByTestId("link-account-btn")).toBeNull();

    expect(screen.getByText("Connect your AARI account")).not.toBeNull();
    expect(
      screen.getByLabelText("Control Room URL").getAttribute("value")
      // Schema get pre-pended automatically
    ).toStrictEqual("https://community2.cloud-2.automationanywhere.digital");

    expect(
      screen.getByLabelText("Username")
      // Schema get pre-pended automatically
    ).not.toBeNull();
  });

  test("Managed Storage OAuth2 partner user", async () => {
    // User will be unauthenticated
    mockMeQuery({
      isLoading: false,
      data: {} as any,
    });

    await browser.storage.managed.set({
      partnerId: "automation-anywhere",
      controlRoomUrl: "https://notarealcontrolroom.com",
    });

    render(
      <Provider store={optionsStore({})}>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.getByText("Connect your AARI account")).not.toBeNull();
    expect(
      screen.getByLabelText("Control Room URL").getAttribute("value")
    ).toStrictEqual("https://notarealcontrolroom.com");
  });
});
