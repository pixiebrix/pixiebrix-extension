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
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { persistSettingsConfig } from "@/store/settingsStorage";
import settingsSlice from "@/store/settingsSlice";
import { renderHook } from "@testing-library/react-hooks";
import { useGetOrganizationTheme, useGetTheme } from "@/hooks/useTheme";
import { Provider } from "react-redux";
import { DEFAULT_THEME } from "@/options/types";
import { useGetMeQuery } from "@/services/api";

jest.mock("@/options/store", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

jest.mock("@/services/api", () => ({
  useGetMeQuery: jest.fn(),
}));

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      settings: persistReducer(persistSettingsConfig, settingsSlice.reducer),
    },
    preloadedState: initialState,
  });
}

describe("useGetTheme", () => {
  test("has no partner", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      partner: null,
    }));

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      wrapper: ({ children }) => (
        <Provider store={optionsStore()}>{children}</Provider>
      ),
    });

    expect(theme).toBe(DEFAULT_THEME);
  });

  test("has partnerId and no me partner", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      partner: null,
    }));

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      wrapper: ({ children }) => (
        <Provider
          store={optionsStore({
            settings: { partnerId: "automation-anywhere" },
          })}
        >
          {children}
        </Provider>
      ),
    });

    expect(theme).toBe("automation-anywhere");
  });

  test("has theme, but no partnerId and no me partner", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      partner: null,
    }));

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      wrapper: ({ children }) => (
        <Provider
          store={optionsStore({ settings: { theme: "automation-anywhere" } })}
        >
          {children}
        </Provider>
      ),
    });

    expect(theme).toBe(DEFAULT_THEME);
  });

  test("has cached partner, but no me partner", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      partner: null,
    }));

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      wrapper: ({ children }) => (
        <Provider
          store={optionsStore({
            auth: {
              partner: {
                theme: "automation-anywhere",
              },
            },
          })}
        >
          {children}
        </Provider>
      ),
    });

    expect(theme).toBe("automation-anywhere");
  });

  test("has partnerId, and me partner", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: {
        partner: {
          theme: "automation-anywhere",
        },
      },
    }));

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      wrapper: ({ children }) => (
        <Provider store={optionsStore({ settings: { partnerId: "default" } })}>
          {children}
        </Provider>
      ),
    });

    expect(theme).toBe("automation-anywhere");
  });

  test("has me partner, and different cached partner", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: {
        partner: {
          theme: "automation-anywhere",
        },
      },
    }));

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      wrapper: ({ children }) => (
        <Provider
          store={optionsStore({ auth: { partner: { theme: "default" } } })}
        >
          {children}
        </Provider>
      ),
    });

    expect(theme).toBe("automation-anywhere");
  });
});

describe("useGetOrganizationTheme", () => {
  const customTestLogoUrl = "https://test-logo.svg";

  test("no loading flicker with cached organization theme", () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: true,
      data: null,
    }));

    const {
      result: { current: organizationTheme },
    } = renderHook(() => useGetOrganizationTheme(), {
      wrapper: ({ children }) => (
        <Provider
          store={optionsStore({
            auth: {
              organization: {
                theme: {
                  show_sidebar_logo: false,
                  logo: customTestLogoUrl,
                },
              },
            },
          })}
        >
          {children}
        </Provider>
      ),
    });

    expect(organizationTheme.showSidebarLogo).toBe(false);
    expect(organizationTheme.customSidebarLogo).toBe(customTestLogoUrl);
  });

  test("new organization theme trumps cached organization theme", () => {
    const newTestLogoUrl = "https://new-test-logo.svg";
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: {
        organization: {
          theme: {
            show_sidebar_logo: false,
            logo: newTestLogoUrl,
          },
        },
      },
    }));

    const {
      result: { current: organizationTheme },
    } = renderHook(() => useGetOrganizationTheme(), {
      wrapper: ({ children }) => (
        <Provider
          store={optionsStore({
            auth: {
              organization: {
                theme: {
                  show_sidebar_logo: true,
                  logo: customTestLogoUrl,
                },
              },
            },
          })}
        >
          {children}
        </Provider>
      ),
    });

    expect(organizationTheme.showSidebarLogo).toBe(false);
    expect(organizationTheme.customSidebarLogo).toBe(newTestLogoUrl);
  });
});
