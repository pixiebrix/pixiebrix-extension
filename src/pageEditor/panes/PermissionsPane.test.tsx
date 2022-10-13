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
import PermissionsPane from "@/pageEditor/panes/PermissionsPane";
import { render, screen } from "@/pageEditor/testHelpers";
import { getCurrentURL } from "@/pageEditor/utils";
import { waitFor } from "@testing-library/react";

jest.mock("@/pageEditor/utils", () => ({
  getCurrentURL: jest.fn(),
}));

jest.mock("@/utils/permissions", () => ({
  canReceiveContentScript: jest.fn(),
}));

describe("PermissionsPane", () => {
  test("it renders", () => {
    (getCurrentURL as jest.Mock).mockReturnValue("https://test.url");
    const rendered = render(<PermissionsPane />);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders the can't modify screen", async () => {
    (getCurrentURL as jest.Mock).mockReturnValue("some.invalid.url");
    render(<PermissionsPane />);

    await waitFor(() => {
      expect(screen.getByText("Get started with PixieBrix")).not.toBeNull();
    });
  });
});
