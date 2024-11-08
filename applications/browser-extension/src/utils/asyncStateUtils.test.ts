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

import {
  assertAsyncStateInvariants,
  errorToAsyncState,
  fallbackValue,
  loadingAsyncStateFactory,
  mergeAsyncState,
  uninitializedAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import { type AsyncState } from "@/types/sliceTypes";

describe("asyncStateUtils", () => {
  it("should combine success states with default zip", () => {
    const state1: AsyncState = {
      data: "data1",
      currentData: "data1",
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
    };

    const state2: AsyncState = {
      data: "data2",
      currentData: "data2",
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
    };

    expect(mergeAsyncState(state1, state2, (...args) => args)).toEqual({
      data: ["data1", "data2"],
      currentData: ["data1", "data2"],
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
    });
  });

  it("custom merge function", () => {
    const state1: AsyncState = {
      data: "data1",
      currentData: "data1",
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
    };

    const state2: AsyncState = {
      data: "data2",
      currentData: "data2",
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
    };

    expect(
      mergeAsyncState(state1, state2, (...xs: string[]) => xs.join("")),
    ).toEqual({
      data: "data1data2",
      currentData: "data1data2",
      isUninitialized: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
    });
  });

  it("generates valid uninitialized state", () => {
    expect(() => {
      assertAsyncStateInvariants(uninitializedAsyncStateFactory());
    }).not.toThrow();
  });

  it("generates valid loaded state", () => {
    expect(() => {
      assertAsyncStateInvariants(valueToAsyncState(42));
    }).not.toThrow();
  });

  it("generates valid error state", () => {
    expect(() => {
      assertAsyncStateInvariants(errorToAsyncState(new Error("error")));
    }).not.toThrow();
  });

  it("generates valid fallback for error state", () => {
    const state = fallbackValue(
      errorToAsyncState<number>(new Error("error")),
      42,
    );
    expect(() => {
      assertAsyncStateInvariants(state);
    }).not.toThrow();
    expect(state.data).toBe(42);
  });

  it("generates valid fallback for loading state", () => {
    const state = fallbackValue(loadingAsyncStateFactory<number>(), 42);
    expect(() => {
      assertAsyncStateInvariants(state);
    }).not.toThrow();
    expect(state.data).toBe(42);
  });

  it("generates valid loading state", () => {
    expect(() => {
      assertAsyncStateInvariants(loadingAsyncStateFactory());
    }).not.toThrow();
  });
});
