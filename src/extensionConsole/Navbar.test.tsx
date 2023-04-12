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
import { MemoryRouter } from "react-router";
import Navbar from "@/extensionConsole/Navbar";
import { render } from "@/extensionConsole/testHelpers";
import { THEME_LOGOS } from "@/themes/themeUtils";
import { type Theme } from "@/themes/themeTypes";

const renderNavbar = () => {
  // There doesn't seem to be significant testable differences between
  // different Theme logos. We'll test with the default PixieBrix logos for now.
  const logo = THEME_LOGOS["default" as Theme];
  return render(
    <MemoryRouter>
      <Navbar logo={logo} />
    </MemoryRouter>
  );
};

describe("Navbar", () => {
  test("renders", () => {
    const rendered = renderNavbar();
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
