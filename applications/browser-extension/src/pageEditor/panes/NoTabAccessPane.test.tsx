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
import NoTabAccessPane from "./NoTabAccessPane";
import { render, screen } from "../testHelpers";
import useCurrentInspectedUrl from "../hooks/useCurrentInspectedUrl";
import { waitFor } from "@testing-library/react";

jest.mock("../hooks/useCurrentInspectedUrl");

describe("PermissionsPane", () => {
  it("renders", () => {
    jest.mocked(useCurrentInspectedUrl).mockReturnValue("https://test.url");
    const { asFragment } = render(<NoTabAccessPane />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders right copy when the URL isn't available", async () => {
    jest.mocked(useCurrentInspectedUrl).mockReturnValue(undefined);
    render(<NoTabAccessPane />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "PixieBrix cannot connect to this page. Try reloading the Tab.",
        ),
      ).toBeInTheDocument();
    });
  });
});
