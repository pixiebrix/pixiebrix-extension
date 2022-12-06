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
import SidebarApp from "@/sidebar/SidebarApp";
import { render } from "@testing-library/react";
import useContextInvalidated from "@/hooks/useContextInvalidated";

jest.mock("@/store/optionsStore", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

jest.mock("@/hooks/useContextInvalidated", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("SidebarApp", () => {
  test("it renders", () => {
    const rendered = render(<SidebarApp />);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders error when context is invalidated", () => {
    (useContextInvalidated as jest.Mock).mockReturnValue(true);
    const rendered = render(<SidebarApp />);
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
