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
import React from "react";
import { renderHook, act } from "@testing-library/react-hooks";
import { waitForEffect } from "@/testUtils/testHelpers";
import useAsyncReduxStore from "./useAsyncReduxStore";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

describe("useAsyncReduxStore", () => {
  test("should resolve promise", async () => {
    
    const store = configureStore({
      reducer: {},
    });

    let listenerCount = 0;

    const getSnapshot = async () => 42;
    const subscribe = () => {
      listenerCount += 1;
      return () => {
        listenerCount -= 1;
      };
    };

    const view = renderHook(() => useAsyncReduxStore(subscribe, getSnapshot, "testSlice", []), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    // Expect(listenerCount).toBe(1);

    expect(view.result.current).toEqual(
      expect.objectContaining({
        isLoading: true,
      })
    );

    await waitForEffect();
    
    expect(view.result.current).toEqual(
      expect.objectContaining({
        isSuccess: true,
        data: 42,
      })
    );

    view.unmount()

    expect(listenerCount).toBe(1);
  });

  // It("should only fetch once when initialized twice", async () => {
  //   let resolveCount = 0;
  //   const getSnapshot = async () => {
  //     resolveCount += 1;
  //     return 42;
  //   }

  //   const subscribe = () => (() => null);

  //   const wrapper1 = renderHook(() => {
  //     useAsyncReduxStore(subscribe, getSnapshot, "testSlice", [])
  //   });
  //   const wrapper2 = renderHook(() => {
  //     useAsyncReduxStore(subscribe, getSnapshot, "testSlice", [])
  //   });

  //   expect(wrapper1.result.current).toEqual(
  //     expect.objectContaining({isLoading: true,})
  //   );
  //   expect(wrapper2.result.current).toEqual(
  //     expect.objectContaining({ isLoading: true,})
  //   );

  //   expect(resolveCount).toBe(0);

  //   await waitForEffect();

  //   expect(wrapper1.result.current).toEqual(
  //     expect.objectContaining({
  //       isSuccess: true,
  //       data: 42,
  //     })
  //   );
  //   expect(wrapper2.result.current).toEqual(
  //     expect.objectContaining({
  //       isSuccess: true,
  //       data: 42,
  //     })
  //   );

  //   expect(resolveCount).toBe(1);
  // });

  // it("should refetch for different arguments", async () => {});
});