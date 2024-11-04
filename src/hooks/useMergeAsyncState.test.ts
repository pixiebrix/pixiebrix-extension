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

import { act, renderHook } from "@testing-library/react";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { identity } from "lodash";
import pDefer from "p-defer";
import useAsyncState from "@/hooks/useAsyncState";
import { waitForEffect } from "@/testUtils/testHelpers";

describe("useMergeAsyncState", () => {
  it("should handle success", async () => {
    const state = valueToAsyncState(42);
    const { result } = renderHook(() => useMergeAsyncState(state, identity));

    await waitForEffect();

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBe(42);
  });

  it("should handle merge error", async () => {
    const merge = () => {
      throw new Error("Test error");
    };

    const state = valueToAsyncState(42);
    const { result } = renderHook(() => useMergeAsyncState(state, merge));

    await waitForEffect();

    expect(result.current.isError).toBe(true);
  });

  it("wait for state", async () => {
    const deferredPromise = pDefer();

    const { result } = renderHook(() => {
      const state = useAsyncState(async () => deferredPromise.promise, []);
      return useMergeAsyncState(state, identity);
    });

    expect(result.current.isLoading).toBe(true);

    deferredPromise.resolve(42);
    await waitForEffect();

    expect(result.current.isLoading).toBe(false);
  });

  it("should refetch", async () => {
    let value = "hello";
    const valueFactory = async () => value;

    const { result } = renderHook(() => {
      const state = useAsyncState(valueFactory, []);
      return useMergeAsyncState(state, identity);
    });

    await waitForEffect();
    expect(result.current.data).toBe("hello");

    await act(async () => {
      value = "goodbye";
      result.current.refetch();
    });

    expect(result.current.data).toBe("goodbye");
  });
});
