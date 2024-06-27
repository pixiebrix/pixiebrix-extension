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
import SidebarBody from "@/sidebar/SidebarBody";
import { render } from "@/sidebar/testHelpers";
import useConnectedTargetUrl from "@/sidebar/hooks/useConnectedTargetUrl";
import useTheme from "@/hooks/useTheme";
import { initialTheme } from "@/themes/themeStore";
import { waitForEffect } from "@/testUtils/testHelpers";
import {
  mockAnonymousMeApiResponse,
  mockAuthenticatedMeApiResponse,
} from "@/testUtils/userMock";

jest.mock("@/sidebar/hooks/useConnectedTargetUrl");
jest.mock("@/hooks/useTheme");
jest.mock("@/contentScript/messenger/api", () => ({
  ensureStarterBricksInstalled: jest.fn(),
  getReservedSidebarEntries: jest.fn().mockResolvedValue({
    panels: [],
    forms: [],
    temporaryPanels: [],
  }),
}));

// Needed until https://github.com/RickyMarou/jest-webextension-mock/issues/5 is implemented
browser.webNavigation.onBeforeNavigate = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
  hasListeners: jest.fn(),
};

describe("SidebarBody", () => {
  beforeEach(() => {
    jest
      .mocked(useTheme)
      .mockReturnValue({ activeTheme: initialTheme, isLoading: false });
  });

  test("it renders with anonymous user", async () => {
    jest
      .mocked(useConnectedTargetUrl)
      .mockReturnValueOnce("https://www.example.com");
    mockAnonymousMeApiResponse();
    const { asFragment } = render(<SidebarBody />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("it renders with authenticated user", async () => {
    jest
      .mocked(useConnectedTargetUrl)
      .mockReturnValueOnce("https://www.example.com");
    await mockAuthenticatedMeApiResponse();
    const { asFragment } = render(<SidebarBody />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("it renders error when URL is restricted", async () => {
    jest
      .mocked(useConnectedTargetUrl)
      .mockReturnValueOnce("chrome://extensions");
    const { asFragment } = render(<SidebarBody />);
    expect(asFragment()).toMatchSnapshot();
  });
});
