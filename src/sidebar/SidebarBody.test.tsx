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
import SidebarBody from "@/sidebar/SidebarBody";
import { render } from "@/sidebar/testHelpers";
import useContextInvalidated from "@/hooks/useContextInvalidated";
import useCurrentUrl from "@/sidebar/hooks/useCurrentUrl";

jest.mock("@/hooks/useContextInvalidated");
jest.mock("@/sidebar/hooks/useCurrentUrl");
jest.mock("@/contentScript/messenger/api", () => ({
  ensureExtensionPointsInstalled: jest.fn(),
  getReservedSidebarEntries: jest.fn().mockResolvedValue({
    panels: [],
    forms: [],
    temporaryPanels: [],
  }),
}));

describe("SidebarBody", () => {
  test("it renders", async () => {
    jest.mocked(useCurrentUrl).mockReturnValueOnce("https://www.example.com");
    const { asFragment } = render(<SidebarBody />);
    expect(asFragment()).toMatchSnapshot();
  });

  test("it renders error when context is invalidated", async () => {
    jest.mocked(useCurrentUrl).mockReturnValueOnce("https://www.example.com");
    jest.mocked(useContextInvalidated).mockReturnValueOnce(true);
    const { asFragment } = render(<SidebarBody />);
    expect(asFragment()).toMatchSnapshot();
  });

  test("it renders error when URL is restricted", async () => {
    jest.mocked(useCurrentUrl).mockReturnValueOnce("chrome://extensions");
    const { asFragment } = render(<SidebarBody />);
    expect(asFragment()).toMatchSnapshot();
  });
});
