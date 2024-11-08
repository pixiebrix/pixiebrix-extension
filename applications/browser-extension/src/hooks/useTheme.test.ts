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

import useTheme from "./useTheme";
import { renderHook } from "../pageEditor/testHelpers";
import { initialTheme } from "../themes/themeStore";
import { type ThemeAssets, themeStorage } from "../themes/themeUtils";
import { activateTheme } from "@/background/messenger/api";
import { readManagedStorage } from "../store/enterprise/managedStorage";
import { INTERNAL_reset as resetAsyncExternalStore } from "./useAsyncExternalStore";

jest.mock("../themes/themeUtils", () => ({
  ...jest.requireActual("@/themes/themeUtils"),
  themeStorage: {
    get: jest.fn(),
    onChanged: jest.fn(),
  },
}));

jest.mock("../store/enterprise/managedStorage", () => ({
  ...jest.requireActual("@/store/enterprise/managedStorage"),
  readManagedStorage: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("../background/messenger/api");

const customTheme: ThemeAssets = {
  themeName: "default",
  showSidebarLogo: true,
  customSidebarLogo: "https://example.com/custom-logo.png",
  toolbarIcon: "https://example.com/custom-icon.svg",
  logo: {
    regular: "https://example.com/custom-logo-regular.png",
    small: "https://example.com/custom-logo-small.png",
  },
  lastFetched: Date.now(),
};

describe("useTheme", () => {
  beforeEach(async () => {
    resetAsyncExternalStore();

    jest.mocked(themeStorage.get).mockResolvedValue({
      ...initialTheme,
      lastFetched: Date.now(),
    });
    jest.mocked(readManagedStorage).mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("calls themeStorage to get the current theme state", async () => {
    const { result: themeResult, waitForNextUpdate } = renderHook(() =>
      useTheme(),
    );

    await waitForNextUpdate();

    expect(themeStorage.get).toHaveBeenCalledOnce();

    expect(themeResult.current).toMatchObject({
      activeTheme: {
        themeName: "default",
        customSidebarLogo: null,
        lastFetched: expect.any(Number),
        logo: { regular: "test-file-stub", small: "test-file-stub" },
        showSidebarLogo: true,
        toolbarIcon: null,
      },
      isLoading: false,
    });
  });

  it("calls activateTheme after loading is done and it hasn't been called recently", async () => {
    jest.useFakeTimers();
    const { rerender, waitForNextUpdate } = renderHook(() => useTheme());
    await waitForNextUpdate();

    expect(activateTheme).not.toHaveBeenCalled();

    jest.advanceTimersByTime(125_000);
    resetAsyncExternalStore();

    rerender();
    await waitForNextUpdate();

    expect(activateTheme).toHaveBeenCalledOnce();
  });

  it.each([
    { policyValue: true, themeValue: true, expectedValue: true },
    { policyValue: true, themeValue: false, expectedValue: true },
    { policyValue: false, themeValue: true, expectedValue: false },
    { policyValue: false, themeValue: false, expectedValue: false },
    { policyValue: undefined, themeValue: true, expectedValue: true },
    { policyValue: undefined, themeValue: false, expectedValue: false },
  ])(
    "handles showSidebarLogo policy (policy: $policyValue, theme: $themeValue, expected: $expectedValue)",
    async ({ policyValue, themeValue, expectedValue }) => {
      const lastFetched = Date.now();
      jest.mocked(themeStorage.get).mockResolvedValue({
        ...customTheme,
        showSidebarLogo: themeValue,
        lastFetched,
      });

      jest.mocked(readManagedStorage).mockResolvedValue({
        showSidebarLogo: policyValue,
      });

      const { result, waitForNextUpdate } = renderHook(() => useTheme());

      await waitForNextUpdate();

      expect(result.current.activeTheme).toMatchObject({
        ...customTheme,
        lastFetched,
        showSidebarLogo: expectedValue,
      });
    },
  );

  it.each([{ showSidebarLogo: true }, { showSidebarLogo: false }])(
    "uses activeTheme when an error occurs in managed storage (showSidebarLogo: $showSidebarLogo)",
    async ({ showSidebarLogo }) => {
      const customThemeWithSidebarLogo = {
        ...customTheme,
        showSidebarLogo,
        lastFetched: Date.now(),
      };

      jest
        .mocked(themeStorage.get)
        .mockResolvedValue(customThemeWithSidebarLogo);

      jest
        .mocked(readManagedStorage)
        .mockRejectedValue(new Error("Managed storage error"));

      const { result, waitForNextUpdate } = renderHook(() => useTheme());

      await waitForNextUpdate();

      expect(result.current.activeTheme.showSidebarLogo).toBe(showSidebarLogo);
    },
  );
});
