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

import pDefer from "p-defer";
import useAsyncState from "@/hooks/useAsyncState";
import { renderHook } from "@/pageEditor/testHelpers";
import { act, waitFor } from "@testing-library/react";
import { waitForNextUpdate } from "@/testUtils/renderHookHelpers";

describe("useAsyncState", () => {
  it("should handle resolve promise", async () => {
    const dependency = pDefer<number>();

    const { result } = renderHook(() => useAsyncState(dependency.promise, []));

    expect(result.current).toEqual({
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

    await waitFor(() => {
      expect(result.current).toEqual({
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
  });

  it("should handle reject promise", async () => {
    const dependency = pDefer<number>();

    const { result } = renderHook(() => useAsyncState(dependency.promise, []));

    expect(result.current).toEqual({
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

    await waitFor(() => {
      expect(result.current).toEqual({
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

  it("should handle refetch for different arguments", async () => {
    let deferred = pDefer<number>();
    let factory = async () => deferred.promise;

    const { result, rerender } = renderHook(
      ({ factory, dependency }) => useAsyncState(factory, [dependency]),
      {
        initialProps: {
          dependency: 42,
          factory,
        },
      },
    );

    await act(async () => {
      deferred.resolve(42);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        data: 42,
        currentData: 42,
      }),
    );

    deferred = pDefer<number>();
    factory = async () => deferred.promise;

    rerender({ factory, dependency: 43 });

    expect(result.current).toEqual(
      expect.objectContaining({
        data: 42,
        currentData: undefined,
        isFetching: true,
      }),
    );

    await act(async () => {
      deferred.resolve(43);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        data: 43,
        currentData: 43,
        isFetching: false,
      }),
    );
  });

  it("should handle refetch for same arguments", async () => {
    const originalFactory = async () => 42;
    const { result, rerender } = renderHook(
      (props) => useAsyncState(props, []),
      {
        initialProps: originalFactory,
      },
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          data: 42,
          currentData: 42,
        }),
      );
    });

    const deferred = pDefer<number>();
    const deferredFactory = async () => deferred.promise;

    rerender(deferredFactory);

    // Separate refetch to allow the factory to swap out
    await act(async () => {
      result.current.refetch();
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        data: 42,
        currentData: 42,
        isFetching: true,
      }),
    );

    await act(async () => {
      deferred.resolve(43);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        data: 43,
        currentData: 43,
        isFetching: false,
      }),
    );
  });

  it("should return a referentially equal (memoized) refetch callback on rerenders", async () => {
    const factory = async () => 42;
    const { result, rerender } = renderHook(
      (props) => useAsyncState(props, []),
      {
        initialProps: factory,
      },
    );

    await waitForNextUpdate(result);

    const firstRefetch = result.current.refetch;

    rerender(factory);

    expect(result.current.refetch).toBe(firstRefetch);

    rerender(factory);

    expect(result.current.refetch).toBe(firstRefetch);
  });
});
