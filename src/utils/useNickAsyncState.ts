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

import {
  type Reducer,
  combineReducers,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { useCallback, useContext, useRef } from "react";
import { ReactReduxContext, useDispatch, useSelector } from "react-redux";
import useAsyncEffect from "use-async-effect";
import { loadingAsyncStateFactory } from "./asyncStateUtils";
import { type AsyncState } from "@/types/sliceTypes";
import { useIsMounted } from "@/hooks/common";
import { type UUID } from "@/types/stringTypes";
import { uuidv4 } from "@/types/helpers";

type ValueFactory<T> = Promise<T> | (() => Promise<T>);

type IRootState = {
  [key: string]: unknown;
  asyncSlice: AsyncState;
};

function useNickAsyncState<T = unknown>(
  inputFn: () => ValueFactory<T>,
  reducer: Reducer<T>,
  dependencies: unknown[]
) {
  const { store } = useContext(ReactReduxContext);
  const dispatch = useDispatch();

  const currentState: IRootState = useSelector((state: IRootState) => state);
  const checkIsMounted = useIsMounted();
  const promiseNonceRef = useRef<UUID>();

  const updateAsync = createAsyncThunk("asyncSlice/updateAsync", async () => {
    if (
      "asyncSlice" in currentState &&
      "isLoading" in currentState.asyncSlice &&
      "data" in currentState.asyncSlice
    ) {
      if (currentState.asyncSlice.data) {
        return currentState.asyncSlice.data;
      }

      if (currentState.asyncSlice.isLoading) {
        return currentState.asyncSlice.currentData;
      }
    }

    // The value we return becomes the `fulfilled` action payload
    const returnValue = await inputFn();
    return returnValue;
  });

  const initializeInternalSlice = () => {
    const slice = createSlice({
      name: "asyncSlice",
      initialState: loadingAsyncStateFactory(),
      reducers: {},
      extraReducers(builder) {
        builder
          .addCase(updateAsync.pending, (state) => {
            state.data = state.currentData;
            state.isUninitialized = false;
            state.isFetching = true;
            state.isLoading = true;
          })
          .addCase(updateAsync.fulfilled, (state, action) => {
            state.data = action.payload;
            state.currentData = action.payload;
            state.isUninitialized = false;
            state.isFetching = false;
            state.isLoading = false;
            state.isSuccess = true;
            state.isError = false;
            state.error = undefined;
          })
          .addCase(updateAsync.rejected, (state, action) => {
            state.isLoading = false;
            state.isFetching = false;
            state.data = undefined;
            state.isError = true;
            state.isSuccess = false;
            state.error = "Error producing data";
          });
      },
    });
    const newRootReducer = combineReducers({
      dummySlice: reducer,
      asyncSlice: slice.reducer,
    });

    store.replaceReducer(newRootReducer);
  };

  if (!currentState.asyncSlice) {
    initializeInternalSlice();
  }

  useAsyncEffect(async () => {
    const nonce = uuidv4();
    promiseNonceRef.current = nonce;
    if (checkIsMounted && promiseNonceRef.current === nonce) {
      dispatch(updateAsync());
    }
  }, dependencies);

  const refetch = useCallback(async () => {
    const nonce = uuidv4();
    promiseNonceRef.current = nonce;
    initializeInternalSlice();
    if (checkIsMounted && promiseNonceRef.current === nonce) {
      dispatch(updateAsync());
    }
  }, [checkIsMounted]);

  return { ...currentState.asyncSlice, refetch };
}

export default useNickAsyncState;
