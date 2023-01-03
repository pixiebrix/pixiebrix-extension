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
import NonScriptablePage from "@/pageEditor/NonScriptablePage";
import { render, screen } from "@/pageEditor/testHelpers";
import { waitFor } from "@testing-library/react";

describe("NonScriptablePage", () => {
  test("it renders", () => {
    const rendered = render(<NonScriptablePage url="https://test.url" />);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders right copy when the URL is HTTP", async () => {
    render(<NonScriptablePage url="http://example.com" />);

    await waitFor(() => {
      expect(
        screen.getByText("PixieBrix cannot modify insecure HTTP pages")
      ).not.toBeNull();
    });
  });
});
