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
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";

describe("useAsyncExternalStore", () => {
  it("should subscribe once", async () => {
    let listenerCount = 0;
    const getSnapshot = async () => 42;
    const subscribe = () => {
      listenerCount += 1;
      return () => {
        listenerCount -= 1;
      };
    };

    const wrapper = renderHook(() => {
      useAsyncExternalStore(subscribe, getSnapshot);
      return useAsyncExternalStore(subscribe, getSnapshot);
    });

    // Should only create 1 listener on the external data source
    expect(listenerCount).toEqual(1);
    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        isLoading: true,
      })
    );

    await act(async () => {});

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        isSuccess: true,
        data: 42,
      })
    );

    wrapper.unmount();

    // We're not unsubscribing -- see implementation for explanation
    expect(listenerCount).toEqual(1);
  });
});
