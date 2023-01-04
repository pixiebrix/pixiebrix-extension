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
import PermissionsPane from "@/pageEditor/panes/PermissionsPane";
import { render, screen } from "@/pageEditor/testHelpers";
import useCurrentUrl from "@/pageEditor/hooks/useCurrentUrl";
import { waitFor } from "@testing-library/react";

jest.mock("@/pageEditor/hooks/useCurrentUrl", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("PermissionsPane", () => {
  test("it renders", () => {
    (useCurrentUrl as jest.Mock).mockReturnValue("https://test.url");
    const rendered = render(<PermissionsPane />);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders right copy when the URL isn't available", async () => {
    (useCurrentUrl as jest.Mock).mockReturnValue(undefined);
    render(<PermissionsPane />);

    await waitFor(() => {
      expect(screen.getByText("Enable PixieBrix on this page")).not.toBeNull();
    });
  });
});
