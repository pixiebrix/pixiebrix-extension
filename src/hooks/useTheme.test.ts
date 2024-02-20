/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { useGetOrganizationTheme, useGetThemeName } from "@/hooks/useTheme";
import { DEFAULT_THEME } from "@/themes/themeTypes";
import { mockAnonymousUser, mockAuthenticatedUser } from "@/testUtils/userMock";
import settingsSlice from "@/store/settings/settingsSlice";
import { uuidv4 } from "@/types/helpers";
import { authActions, authSlice } from "@/auth/authSlice";
import {
  authStateFactory,
  partnerUserFactory,
  userFactory,
  userOrganizationFactory,
} from "@/testUtils/factories/authFactories";
import { renderHook } from "@/pageEditor/testHelpers";

describe("useGetThemeName", () => {
  test("has no partner", async () => {
    await mockAuthenticatedUser(userFactory());

    const { result: themeResult, waitFor } = renderHook(() =>
      useGetThemeName(),
    );

    await waitFor(() => {
      expect(themeResult.current).toBe(DEFAULT_THEME);
    });
  });

  test("has partnerId and no me partner", async () => {
    await mockAuthenticatedUser(userFactory());

    const { result: themeResult, waitFor } = renderHook(
      () => useGetThemeName(),
      {
        setupRedux(dispatch) {
          dispatch(
            settingsSlice.actions.setPartnerId({
              partnerId: "automation-anywhere",
            }),
          );
        },
      },
    );

    await waitFor(() => {
      expect(themeResult.current).toBe("automation-anywhere");
    });
  });

  test("has theme, but no partnerId and no me partner", async () => {
    mockAnonymousUser();

    const { result: themeResult, waitFor } = renderHook(
      () => useGetThemeName(),
      {
        setupRedux(dispatch) {
          dispatch(
            settingsSlice.actions.setTheme({ theme: "automation-anywhere" }),
          );
        },
      },
    );

    await waitFor(() => {
      expect(themeResult.current).toBe(DEFAULT_THEME);
    });
  });

  test("has cached partner, but no me partner", async () => {
    mockAnonymousUser();

    const { result: themeResult, waitFor } = renderHook(
      () => useGetThemeName(),
      {
        setupRedux(dispatch) {
          dispatch(
            authSlice.actions.setAuth(
              authStateFactory({
                partner: {
                  name: "Automation Anywhere",
                  theme: "automation-anywhere",
                },
              }),
            ),
          );
        },
      },
    );

    await waitFor(() => {
      expect(themeResult.current).toBe("automation-anywhere");
    });
  });

  test("has partnerId, and me partner", async () => {
    await mockAuthenticatedUser(partnerUserFactory());

    const { result: themeResult, waitFor } = renderHook(
      () => useGetThemeName(),
      {
        setupRedux(dispatch) {
          dispatch(
            settingsSlice.actions.setPartnerId({ partnerId: "default" }),
          );
        },
      },
    );

    await waitFor(() => {
      expect(themeResult.current).toBe("automation-anywhere");
    });
  });

  test("has me partner, and different cached partner", async () => {
    await mockAuthenticatedUser(partnerUserFactory());

    const { result: themeResult, waitFor } = renderHook(
      () => useGetThemeName(),
      {
        setupRedux(dispatch) {
          dispatch(
            authActions.setAuth(
              authStateFactory({
                partner: {
                  name: "PixieBrix",
                  theme: "default",
                },
              }),
            ),
          );
        },
      },
    );

    await waitFor(() => {
      expect(themeResult.current).toBe("automation-anywhere");
    });
  });
});

describe("useGetOrganizationTheme", () => {
  const customTestLogoUrl = "https://test-logo.svg";

  test("new organization theme trumps cached organization theme", async () => {
    const newTestLogoUrl = "https://new-test-logo.svg";
    const newTestToolbarIconUrl = "https://test-logo.svg";

    await mockAuthenticatedUser(
      userFactory({
        organization: userOrganizationFactory({
          theme: {
            show_sidebar_logo: false,
            logo: newTestLogoUrl,
            toolbar_icon: newTestToolbarIconUrl,
          },
        }),
      }),
    );

    const { result: organizationThemeResult, waitFor } = renderHook(
      () => useGetOrganizationTheme(),
      {
        setupRedux(dispatch) {
          dispatch(
            authActions.setAuth(
              authStateFactory({
                organization: {
                  id: uuidv4(),
                  name: "Cached Organization",
                  theme: {
                    show_sidebar_logo: true,
                    logo: customTestLogoUrl,
                    toolbar_icon: "someOldOne.svg",
                  },
                },
              }),
            ),
          );
        },
      },
    );

    await waitFor(() => {
      expect(organizationThemeResult.current.showSidebarLogo).toBe(false);
    });
    expect(organizationThemeResult.current.customSidebarLogo).toBe(
      newTestLogoUrl,
    );
    expect(organizationThemeResult.current.toolbarIcon).toBe(
      newTestToolbarIconUrl,
    );
  });
});
