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

import useTheme from "@/hooks/useTheme";
import { renderHook } from "@/pageEditor/testHelpers";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";
import { initialTheme } from "@/themes/themeStore";
import { type AsyncState } from "@/types/sliceTypes";
import { themeStorage } from "@/themes/themeUtils";
import { activateTheme } from "@/background/messenger/api";
import { readManagedStorage } from "@/store/enterprise/managedStorage";

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("@/hooks/useAsyncExternalStore");
jest.mock("@/background/messenger/api");
jest.mock("@/store/enterprise/managedStorage");

const customTheme = {
  themeName: "custom",
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
    jest
      .mocked(useAsyncExternalStore)
      .mockReturnValue({ data: initialTheme, isLoading: false } as AsyncState);
    jest.mocked(readManagedStorage).mockResolvedValue({});
  });

  test("calls useAsyncExternalStore and gets current theme state", async () => {
    const { result: themeResult } = renderHook(() => useTheme());

    expect(useAsyncExternalStore).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      themeStorage.get,
    );

    expect(themeResult.current).toStrictEqual({
      activeTheme: {
        themeName: "default",
        customSidebarLogo: null,
        lastFetched: null,
        logo: { regular: "test-file-stub", small: "test-file-stub" },
        showSidebarLogo: true,
        toolbarIcon: null,
      },
      isLoading: false,
    });
  });

  it("calls activateTheme after loading is done and it hasn't been called recently", () => {
    jest.useFakeTimers();

    jest.mocked(useAsyncExternalStore).mockReturnValue({
      data: { ...initialTheme, lastFetched: Date.now() },
      isLoading: false,
    } as AsyncState);

    renderHook(() => useTheme());

    expect(activateTheme).not.toHaveBeenCalled();

    jest.advanceTimersByTime(125_000);

    renderHook(() => useTheme());

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
      jest.mocked(useAsyncExternalStore).mockReturnValue({
        data: { ...customTheme, showSidebarLogo: themeValue },
        isLoading: false,
      } as AsyncState);
      jest.mocked(readManagedStorage).mockResolvedValue({
        showSidebarLogo: policyValue,
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.activeTheme).toMatchObject({
        ...customTheme,
        showSidebarLogo: expectedValue,
      });
    },
  );

  it("uses activeTheme when an error occurs in managed storage", async () => {
    jest.mocked(useAsyncExternalStore).mockReturnValue({
      data: customTheme,
      isLoading: false,
    } as AsyncState);

    jest
      .mocked(readManagedStorage)
      .mockRejectedValue(new Error("Managed storage error"));

    const { result } = renderHook(() => useTheme());

    expect(result.current.activeTheme.showSidebarLogo).toBe(
      customTheme.showSidebarLogo,
    );
  });
});
