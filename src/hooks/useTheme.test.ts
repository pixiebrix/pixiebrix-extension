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
import { activateTheme } from "@/background/messenger/strict/api";

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("@/hooks/useAsyncExternalStore");
jest.mock("@/background/messenger/strict/api");

describe("useTheme", () => {
  beforeEach(() => {
    jest
      .mocked(useAsyncExternalStore)
      .mockReturnValue({ data: initialTheme, isLoading: false } as AsyncState);
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
        baseThemeName: "default",
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

    jest.advanceTimersByTime(35_000);

    renderHook(() => useTheme());
    expect(activateTheme).toHaveBeenCalledOnce();
  });
});
