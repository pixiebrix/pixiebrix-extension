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

import pDefer from "p-defer";
import { act, renderHook } from "@testing-library/react-hooks";
import useAsyncState from "@/hooks/useAsyncState";

describe("useAsyncState", () => {
  it("should handle resolve promise", async () => {
    const dependency = pDefer<number>();

    const wrapper = renderHook(() => useAsyncState(dependency.promise, []));

    expect(wrapper.result.current).toEqual({
      isFetching: true,
      isLoading: true,
      currentData: undefined,
      data: undefined,
      error: undefined,
      isError: false,
      isSuccess: false,
      isUninitialized: false,
      refetch: expect.toBeFunction(),
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
      refetch: expect.toBeFunction(),
    });
  });

  it("should handle reject promise", async () => {
    const dependency = pDefer<number>();

    const wrapper = renderHook(() => useAsyncState(dependency.promise, []));

    expect(wrapper.result.current).toEqual({
      isFetching: true,
      isLoading: true,
      currentData: undefined,
      data: undefined,
      error: undefined,
      isError: false,
      isSuccess: false,
      isUninitialized: false,
      refetch: expect.toBeFunction(),
    });

    dependency.reject(new Error("Expected error"));

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
      refetch: expect.toBeFunction(),
    });
  });
});
