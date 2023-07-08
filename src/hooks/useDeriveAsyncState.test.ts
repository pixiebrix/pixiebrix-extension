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

import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { act, renderHook } from "@testing-library/react-hooks";
import pDefer from "p-defer";
import useAsyncState from "@/hooks/useAsyncState";

describe("useDeriveAsyncState", () => {
  it("should handle empty args", async () => {
    const wrapper = renderHook(() => useDeriveAsyncState(async () => 42));

    expect(wrapper.result.current).toEqual({
      isFetching: true,
      isLoading: true,
      currentData: undefined,
      data: undefined,
      error: undefined,
      isError: false,
      isSuccess: false,
      isUninitialized: true,
    });

    await wrapper.waitForNextUpdate();

    expect(wrapper.result.current).toEqual({
      isFetching: false,
      isLoading: false,
      currentData: 42,
      data: 42,
      error: undefined,
      isError: false,
      isSuccess: true,
      isUninitialized: false,
    });
  });

  it("should handle upstream success", async () => {
    const dependency = pDefer<number>();

    const wrapper = renderHook(() => {
      const state = useAsyncState(dependency.promise, []);
      return useDeriveAsyncState(state, async (x: number) => x);
    });

    expect(wrapper.result.current).toEqual({
      isFetching: true,
      isLoading: true,
      currentData: undefined,
      data: undefined,
      error: undefined,
      isError: false,
      isSuccess: false,
      isUninitialized: false,
    });

    dependency.resolve(42);

    await act(async () => {});

    expect(wrapper.result.current).toEqual({
      isFetching: false,
      isLoading: false,
      currentData: 42,
      data: 42,
      error: undefined,
      isError: false,
      isSuccess: true,
      isUninitialized: false,
    });
  });

  it("should handle upstream error", async () => {
    const dependency = pDefer<number>();

    const wrapper = renderHook(() => {
      const state = useAsyncState(dependency.promise, []);
      return useDeriveAsyncState(state, async (x: number) => x);
    });

    expect(wrapper.result.current).toEqual({
      isFetching: true,
      isLoading: true,
      currentData: undefined,
      data: undefined,
      error: undefined,
      isError: false,
      isSuccess: false,
      isUninitialized: false,
    });

    dependency.reject(new Error("Test Error"));

    await act(async () => {});

    expect(wrapper.result.current).toEqual({
      isFetching: false,
      isLoading: false,
      currentData: undefined,
      data: undefined,
      error: expect.toBeObject(),
      isError: true,
      isSuccess: false,
      isUninitialized: false,
    });
  });
});
