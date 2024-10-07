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

import { INTERNAL_reset } from "@/store/enterprise/managedStorage";
import { renderHook } from "@testing-library/react-hooks";
import useManagedStorageState from "@/store/enterprise/useManagedStorageState";

beforeEach(async () => {
  await INTERNAL_reset();
  await browser.storage.managed.clear();
});

describe("useManagedStorageState", () => {
  it("waits on uninitialized state", async () => {
    const { result, waitFor } = renderHook(() => useManagedStorageState());
    expect(result.current).toStrictEqual({
      currentData: undefined,
      data: undefined,
      error: undefined,
      isError: false,
      isFetching: true,
      isLoading: true,
      isSuccess: false,
      isUninitialized: false,
    });

    await waitFor(
      () => {
        expect(result.current).toStrictEqual({
          data: {},
          isLoading: false,
        });
      },
      // XXX: figure out how to use fake timers to avoid slowing down test suite
      // Must be longer than MAX_MANAGED_STORAGE_WAIT_MILLIS
      { timeout: 5000 },
    );
  });

  it("handles already initialized state", async () => {
    await browser.storage.managed.set({ partnerId: "taco-bell" });

    const { result, waitForNextUpdate } = renderHook(() =>
      useManagedStorageState(),
    );

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({
      currentData: {
        partnerId: "taco-bell",
      },
      data: {
        partnerId: "taco-bell",
      },
      error: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      refetch: expect.any(Function),
    });
  });

  // Can't test because mock doesn't fire change events: https://github.com/clarkbw/jest-webextension-mock/issues/170
  it.skip("listens for changes", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useManagedStorageState(),
    );
    expect(result.current.data).toBeUndefined();
    await browser.storage.managed.set({ partnerId: "taco-bell" });
    await waitForNextUpdate();
    expect(result.current).toStrictEqual({
      data: { partnerId: "taco-bell" },
      isLoading: false,
    });
  });
});
