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
import ConnectedSidebar from "@/sidebar/ConnectedSidebar";
import { render } from "@/sidebar/testHelpers";
import { authActions } from "@/auth/authSlice";
import { authStateFactory } from "@/testUtils/factories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { useGetMeQuery } from "@/services/api";
import { anonAuth } from "@/auth/authConstants";

jest.mock("@/options/store", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));
jest.mock("@/services/api", () => ({
  useGetMeQuery: jest.fn(),
  appApi: {
    reducerPath: "appApi",
  },
}));
jest.mock("@/auth/token", () => {
  const originalModule = jest.requireActual("@/auth/token");
  return {
    ...originalModule,
    isLinked: jest.fn().mockResolvedValue(true),
  };
});

describe("SidebarApp", () => {
  test("renders not connected", async () => {
    (useGetMeQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: anonAuth,
    });

    const rendered = render(<ConnectedSidebar />);
    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders", async () => {
    (useGetMeQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: authStateFactory(),
    });

    const rendered = render(<ConnectedSidebar />, {
      setupRedux(dispatch) {
        dispatch(authActions.setAuth(authStateFactory()));
      },
    });

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
