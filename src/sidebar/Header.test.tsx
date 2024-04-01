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
import { screen, render } from "@/sidebar/testHelpers";
import Header from "@/sidebar/Header";
import useTheme from "@/hooks/useTheme";

import { waitFor } from "@testing-library/react";
import { initialTheme } from "@/themes/themeStore";

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock("@/hooks/useTheme");

describe("Header", () => {
  beforeEach(() => {
    jest
      .mocked(useTheme)
      .mockReturnValue({ activeTheme: initialTheme, isLoading: false });
  });

  it("renders", () => {
    const { asFragment } = render(<Header />);

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByTestId("sidebarHeaderLogo")).not.toBeNull();
  });

  it("renders sidebar header logo per organization theme", async () => {
    const { asFragment } = render(<Header />);
    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByTestId("sidebarHeaderLogo")).not.toBeNull();
  });

  it("renders no sidebar header logo per organization theme", async () => {
    jest.mocked(useTheme).mockReturnValue({
      activeTheme: { ...initialTheme, showSidebarLogo: false },
      isLoading: false,
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.queryByTestId("sidebarHeaderLogo")).toBeNull();
    });
  });
});
