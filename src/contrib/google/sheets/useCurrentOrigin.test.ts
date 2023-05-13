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

import useCurrentOrigin from "@/contrib/google/sheets/useCurrentOrigin";
import { renderHook } from "@/sidebar/testHelpers";
import Tab = chrome.tabs.Tab;
import { waitForEffect } from "@/testUtils/testHelpers";
import { setContext } from "@/testUtils/detectPageMock";

const originalRuntime = browser.runtime;
browser.runtime = {
  ...originalRuntime,
};

const PAGE_EDITOR_PATHNAME = "/pageEditor.html";
const DEVTOOLS_ORIGIN = "devtools://devtools";

const originalTabs = chrome.tabs;
chrome.tabs = {
  ...originalTabs,
  query: jest.fn(),
};
const queryMock = chrome.tabs.query as jest.MockedFunction<
  typeof chrome.tabs.query
>;

const originalLocation = location;

describe("useCurrentOrigin", () => {
  afterEach(() => {
    jest.resetAllMocks();
    location = originalLocation;
  });

  afterAll(() => {
    browser.runtime = originalRuntime;
    chrome.tabs = originalTabs;
  });

  test("if options page, should return options url", async () => {
    setContext("options");
    const { result } = renderHook(() => useCurrentOrigin());
    // Wait for origin to load (async state)
    await waitForEffect();
    expect(result.current).toBe("chrome-extension://abcxyz/");
  });

  test("if devtools page, should return devtools origin", async () => {
    setContext("devToolsPage");
    const { result } = renderHook(() => useCurrentOrigin());
    // Wait for origin to load (async state)
    await waitForEffect();
    expect(result.current).toBe(DEVTOOLS_ORIGIN);
  });

  test("if page editor page, should return devtools origin", async () => {
    setContext("extension");
    location = {
      pathname: PAGE_EDITOR_PATHNAME,
    } as Location;
    const { result } = renderHook(() => useCurrentOrigin());
    // Wait for origin to load (async state)
    await waitForEffect();
    // Page editor should return devtools origin since it's a panel in the devtools
    expect(result.current).toBe(DEVTOOLS_ORIGIN);
  });

  test("if other page, should return current tab url", async () => {
    const OTHER_URL = "https://www.pixiebrix.com";
    setContext("web");
    queryMock.mockResolvedValue([
      {
        url: OTHER_URL,
      } as Tab,
    ]);
    const { result } = renderHook(() => useCurrentOrigin());
    // Wait for origin to load (async state)
    await waitForEffect();
    expect(result.current).toBe(OTHER_URL);
  });
});
