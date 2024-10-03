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
import { readManagedStorageByKey } from "@/store/enterprise/managedStorage";

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
    // eslint-disable-next-line no-restricted-syntax -- this func requires a parameter
    jest.mocked(readManagedStorageByKey).mockResolvedValue(undefined);
  });

  test("calls useAsyncExternalStore and gets current theme state", async () => {
    const { result: themeResult, waitForNextUpdate } = renderHook(() =>
      useTheme(),
    );

    await waitForNextUpdate();

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

  it("calls activateTheme after loading is done and it hasn't been called recently", async () => {
    jest.useFakeTimers();

    jest.mocked(useAsyncExternalStore).mockReturnValue({
      data: { ...initialTheme, lastFetched: Date.now() },
      isLoading: false,
    } as AsyncState);

    let result = renderHook(() => useTheme());
    await result.waitForNextUpdate();
    expect(activateTheme).not.toHaveBeenCalled();

    jest.advanceTimersByTime(125_000);

    result = renderHook(() => useTheme());
    await result.waitForNextUpdate();
    expect(activateTheme).toHaveBeenCalledOnce();
  });

  it.each([{ policyValue: true }, { policyValue: false }])(
    "overrides activeTheme when showSidebarLogo policy is $policyValue in managed storage",
    async ({ policyValue }) => {
      jest.mocked(useAsyncExternalStore).mockReturnValue({
        data: { ...customTheme, showSidebarLogo: !policyValue },
        isLoading: false,
      } as AsyncState);
      jest.mocked(readManagedStorageByKey).mockResolvedValue(policyValue);

      const { result, waitForNextUpdate } = renderHook(() => useTheme());

      await waitForNextUpdate();

      expect(result.current.activeTheme).toMatchObject({
        ...customTheme,
        showSidebarLogo: policyValue,
      });
    },
  );

  it.each([
    { scenario: "showSidebarLogo is undefined", mockPolicyValue: undefined },
    {
      scenario: "error occurs",
      mockPolicyValue: new Error("Managed storage error"),
    },
  ])(
    "uses activeTheme when $scenario in managed storage",
    async ({ mockPolicyValue }) => {
      jest.mocked(useAsyncExternalStore).mockReturnValue({
        data: customTheme,
        isLoading: false,
      } as AsyncState);

      if (mockPolicyValue instanceof Error) {
        jest.mocked(readManagedStorageByKey).mockRejectedValue(mockPolicyValue);
      } else {
        jest.mocked(readManagedStorageByKey).mockResolvedValue(mockPolicyValue);
      }

      const { result, waitForNextUpdate } = renderHook(() => useTheme());

      await waitForNextUpdate();

      expect(result.current.activeTheme.showSidebarLogo).toBe(
        customTheme.showSidebarLogo,
      );
    },
  );
});
