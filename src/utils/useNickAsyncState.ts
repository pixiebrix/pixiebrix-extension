import {
  type Reducer,
  combineReducers,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { useCallback, useContext } from "react";
import { ReactReduxContext, useDispatch, useSelector } from "react-redux";
import useAsyncEffect from "use-async-effect";
import { loadingAsyncStateFactory } from "./asyncStateUtils";

type ValueFactory<T> = Promise<T> | (() => Promise<T>);

function useNickAsyncState<T = unknown>(
  inputFn: () => ValueFactory<T>,
  reducer: Reducer<T>,
  dependencies: unknown[]
) {
  const { store } = useContext(ReactReduxContext);
  const dispatch = useDispatch();

  const currentState = useSelector((state) => state);

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
        return currentState.asyncSlice.data;
      }
    }

    const returnValue = await inputFn();
    // The value we return becomes the `fulfilled` action payload
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

  const { asyncSlice } = store.getState();
  if (!asyncSlice) {
    initializeInternalSlice();
  }

  useAsyncEffect(async () => {
    initializeInternalSlice();
    dispatch(updateAsync());
  }, dependencies);

  const refetch = useCallback(async () => {
    dispatch(updateAsync());
  }, [inputFn]);

  return { ...currentState.asyncSlice, refetch };
}

export default useNickAsyncState;
