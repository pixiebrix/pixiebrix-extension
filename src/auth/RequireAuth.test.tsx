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

import React from "react";
import RequireAuth from "@/auth/RequireAuth";
import {
  mockAuthenticatedMeApiResponse,
  mockErrorMeApiResponse,
} from "@/testUtils/userMock";
import { render, screen } from "@/pageEditor/testHelpers";
import { waitFor } from "@testing-library/react";

const MockLoginPage: React.FC = () => <div>Login</div>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RequireAuth", () => {
  test("authenticated user", async () => {
    await mockAuthenticatedMeApiResponse();

    render(
      <RequireAuth LoginPage={MockLoginPage}>
        Only authenticated users should see me!
      </RequireAuth>,
    );

    await expect(
      screen.findByTestId("loader"),
    ).resolves.not.toBeInTheDocument();
    expect(
      screen.getByText("Only authenticated users should see me!"),
    ).toBeVisible();
  });

  test("unauthenticated user", async () => {
    mockErrorMeApiResponse({
      response: { status: 401 },
    });

    render(
      <RequireAuth LoginPage={MockLoginPage}>
        Only authenticated users should see me!
      </RequireAuth>,
    );

    await waitFor(async () => {
      await expect(screen.findByText("Login")).resolves.toBeVisible();
    });
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Only authenticated users should see me!"),
    ).not.toBeInTheDocument();
  });
});
