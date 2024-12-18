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

import { INTERNAL_reset as resetManagedStorage } from "@/store/enterprise/managedStorage";
import { INTERNAL_reset as resetAsyncExternalStore } from "@/hooks/useAsyncExternalStore";
import useManagedStorageState from "@/store/enterprise/useManagedStorageState";
import {
  loadingAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import { renderHook } from "@/testUtils/renderWithCommonStore";
import { waitFor } from "@testing-library/react";

beforeEach(async () => {
  await resetManagedStorage();
  resetAsyncExternalStore();
  await browser.storage.managed.clear();
});

describe("useManagedStorageState", () => {
  it("waits on uninitialized state", async () => {
    const { result } = renderHook(() => useManagedStorageState());
    expect(result.current).toStrictEqual(loadingAsyncStateFactory());

    await waitFor(
      () => {
        expect(result.current).toStrictEqual(valueToAsyncState({}));
      },
      {
        // `readManagedStorage` will take a few seconds if there are no policies set
        timeout: 5000,
      },
    );
  });

  it("handles already initialized state", async () => {
    const expectedPolicy = { partnerId: "foo" };
    await browser.storage.managed.set(expectedPolicy);

    const { result } = renderHook(() => useManagedStorageState());

    await waitFor(() => {
      expect(result.current).toStrictEqual(valueToAsyncState(expectedPolicy));
    });
  });

  it("listens for changes", async () => {
    const { result } = renderHook(() => useManagedStorageState());
    expect(result.current.data).toBeUndefined();

    const expectedPolicy = { partnerId: "foo" };
    await browser.storage.managed.set(expectedPolicy);

    await waitFor(() => {
      expect(result.current).toStrictEqual(valueToAsyncState(expectedPolicy));
    });
  });
});
