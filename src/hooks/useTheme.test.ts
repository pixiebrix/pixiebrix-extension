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

import { useGetOrganizationTheme, useGetTheme } from "@/hooks/useTheme";
import { DEFAULT_THEME } from "@/themes/themeTypes";
import { mockAnonymousUser, mockCachedUser } from "@/testUtils/userMock";
import { renderHook } from "@/testUtils/renderWithCommonStore";
import settingsSlice from "@/store/settingsSlice";
import { uuidv4 } from "@/types/helpers";
import { authSlice } from "@/auth/authSlice";
import {
  authStateFactory,
  partnerUserFactory,
  userFactory,
  userOrganizationFactory,
} from "@/testUtils/factories/authFactories";

describe("useGetTheme", () => {
  test("has no partner", () => {
    mockCachedUser(userFactory());

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme());

    expect(theme).toBe(DEFAULT_THEME);
  });

  test("has partnerId and no me partner", () => {
    mockCachedUser(userFactory());

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      setupRedux(dispatch) {
        dispatch(
          settingsSlice.actions.setPartnerId({
            partnerId: "automation-anywhere",
          })
        );
      },
    });

    expect(theme).toBe("automation-anywhere");
  });

  test("has theme, but no partnerId and no me partner", () => {
    mockAnonymousUser();

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      setupRedux(dispatch) {
        dispatch(
          settingsSlice.actions.setTheme({ theme: "automation-anywhere" })
        );
      },
    });

    expect(theme).toBe(DEFAULT_THEME);
  });

  test("has cached partner, but no me partner", () => {
    mockAnonymousUser();

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      setupRedux(dispatch) {
        dispatch(
          authSlice.actions.setAuth(
            authStateFactory({
              partner: {
                name: "Automation Anywhere",
                theme: "automation-anywhere",
              },
            })
          )
        );
      },
    });

    expect(theme).toBe("automation-anywhere");
  });

  test("has partnerId, and me partner", () => {
    mockCachedUser(partnerUserFactory());

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      setupRedux(dispatch) {
        dispatch(settingsSlice.actions.setPartnerId({ partnerId: "default" }));
      },
    });

    expect(theme).toBe("automation-anywhere");
  });

  test("has me partner, and different cached partner", () => {
    mockCachedUser(partnerUserFactory());

    const {
      result: { current: theme },
    } = renderHook(() => useGetTheme(), {
      setupRedux(dispatch) {
        authStateFactory({
          partner: {
            name: "PixieBrix",
            theme: "default",
          },
        });
      },
    });

    expect(theme).toBe("automation-anywhere");
  });
});

describe("useGetOrganizationTheme", () => {
  const customTestLogoUrl = "https://test-logo.svg";

  test("new organization theme trumps cached organization theme", () => {
    const newTestLogoUrl = "https://new-test-logo.svg";

    mockCachedUser(
      userFactory({
        organization: userOrganizationFactory({
          theme: {
            show_sidebar_logo: false,
            logo: newTestLogoUrl,
          },
        }),
      })
    );

    const {
      result: { current: organizationTheme },
    } = renderHook(() => useGetOrganizationTheme(), {
      setupRedux(dispatch) {
        authStateFactory({
          organization: {
            id: uuidv4(),
            name: "Cached Organization",
            theme: {
              show_sidebar_logo: true,
              logo: customTestLogoUrl,
            },
          },
        });
      },
    });

    expect(organizationTheme.showSidebarLogo).toBe(false);
    expect(organizationTheme.customSidebarLogo).toBe(newTestLogoUrl);
  });
});
