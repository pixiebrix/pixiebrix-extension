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

import { act, renderHook } from "@testing-library/react-hooks";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { identity } from "lodash";
import pDefer from "p-defer";
import useAsyncState from "@/hooks/useAsyncState";

describe("useMergeAsyncState", () => {
  it("should handle success", async () => {
    const state = valueToAsyncState(42);
    const wrapper = renderHook(() => useMergeAsyncState(state, identity));

    await act(async () => {});

    expect(wrapper.result.current.isSuccess).toBe(true);
    expect(wrapper.result.current.data).toBe(42);
  });

  it("should handle merge error", async () => {
    const merge = () => {
      throw new Error("Test error");
    };

    const state = valueToAsyncState(42);
    const wrapper = renderHook(() => useMergeAsyncState(state, merge));

    await act(async () => {});

    expect(wrapper.result.current.isError).toBe(true);
  });

  it("wait for state", async () => {
    const deferredPromise = pDefer();

    const wrapper = renderHook(() => {
      const state = useAsyncState(async () => deferredPromise.promise, []);
      return useMergeAsyncState(state, identity);
    });

    expect(wrapper.result.current.isLoading).toBe(true);

    deferredPromise.resolve(42);
    await act(async () => {});

    expect(wrapper.result.current.isLoading).toBe(false);
  });

  it("should refetch", async () => {
    let value = "hello";
    const valueFactory = async () => value;

    const wrapper = renderHook(() => {
      const state = useAsyncState(valueFactory, []);
      return useMergeAsyncState(state, identity);
    });

    await act(async () => {});
    expect(wrapper.result.current.data).toBe("hello");

    await act(async () => {
      value = "goodbye";
      wrapper.result.current.refetch();
    });

    expect(wrapper.result.current.data).toBe("goodbye");
  });
});
