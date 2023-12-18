/* eslint-disable security/detect-object-injection -- working with records a lot */
import { type AsyncState } from "@/types/sliceTypes";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo } from "react";
import { createSlice } from "@reduxjs/toolkit";
import { revertAll } from "@/store/commonActions";
import { uuidv4 } from "@/types/helpers";

type UseAsyncReduxStateOptions = {
  inputArgs?: unknown[];
  // TODO: actually use cachePolicy in the useAsyncReduxState hook, right now it always behaves as "cache-first"
  cachePolicy?:
    | "cache-first" // Returns cached response immediately if available and skips executing the async function (default)
    | "cache-and-remote" // Returns cached response immediately if available and updates with the promise result once fulfilled
    | "remote-only"; // Waits for the promise result each time
  // TODO: add conditional option for skipping fetch
};

// TODO: add refetch to the returned value of useAsyncReduxState
type AsyncReduxState = AsyncState & {
  // The hook that should perform the fetch if true, to avoid fetch race conditions
  _currentHookId?: string;
};

type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

type AsyncReduxRootState = Record<
  string, // ID to uniquely represent the corresponding async function.
  {
    // A map of the serialized arguments list to the current async result state
    results: Record<string, AsyncReduxState>;
  }
>;

const initialAsyncReduxState: AsyncReduxRootState = {};

const initialAsyncState: AsyncReduxState = Object.freeze({
  data: undefined,
  currentData: undefined,
  isUninitialized: true,
  isFetching: false,
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: undefined,
});

export const asyncStateSlice = createSlice({
  name: "asyncState",
  initialState: initialAsyncReduxState,
  reducers: {
    updateAsyncState(
      states,
      {
        payload: { functionId, args, state },
      }: {
        payload: {
          functionId: string;
          args: unknown[];
          state: AsyncReduxState;
        };
      }
    ) {
      const argsKey = JSON.stringify(args);
      states[functionId] ||= { results: {} };
      const currentState = states[functionId].results[argsKey];
      states[functionId].results[argsKey] = {
        ...state,
        // If there is already a currentHookId defined, then reject any other updates for this field.
        _currentHookId: currentState?._currentHookId || state._currentHookId,
      };
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialAsyncReduxState);
  },
});

export const getSelectAsyncFunctionResult =
  (functionId: string, args: unknown[] = []) =>
  ({ asyncStateSlice }: { asyncStateSlice: AsyncReduxRootState }) =>
    asyncStateSlice[functionId]?.results[JSON.stringify(args)] ||
    initialAsyncState;

/**
 * Connects an asynchronous function to the Redux store, managing its state and lifecycle.
 * It handles fetching data, caching, and updating the Redux state based on the function's execution.
 * This hook is designed to avoid race conditions in fetching and to allow for controlled data fetching and state management.
 *
 * @param {string} functionId - A unique identifier for the asynchronous function. Used to manage its state in the Redux store.
 * @param {AsyncFunction} asyncFunction - The asynchronous function that will be executed. This function should return a promise.
 * @param {UseAsyncReduxStateOptions} [options] - Optional configuration for the hook, including input arguments and caching policies.
 * @returns {AsyncReduxState} - The current state of the asynchronous function, including data, loading, and error states.
 *
 * Usage:
 *
 * Suppose you have an asynchronous function `fetchUserData` that fetches user data from an API:
 *
 * ```javascript
 * const fetchUserData = async (userId) => {
 *   const response = await fetch(`/api/users/${userId}`);
 *   return await response.json();
 * };
 * ```
 *
 * You can use `useAsyncReduxState` to connect this function to your Redux store:
 *
 * ```javascript
 * const UserDataComponent = ({ userId }) => {
 *   const userData = useAsyncReduxState(
 *     'fetchUserData',      // Unique ID for this async function
 *     () => fetchUserData(userId), // The async function itself
 *     { inputArgs: [userId] } // Arguments for the async function
 *   );
 *
 *   if (userData.isLoading) return <div>Loading...</div>;
 *   if (userData.isError) return <div>Error: {userData.error.message}</div>;
 *   return <div>User Name: {userData.data.name}</div>;
 * };
 * ```
 *
 * This hook will manage fetching the data, updating the Redux state with the results, and re-fetching the data if the `userId` changes.
 * Since it is synchronized with the redux store, if the function store is updated directly, then it will be automatically
 * reflected by the hook.
 */
export const useAsyncReduxState = (
  functionId: string,
  asyncFunction: AsyncFunction,
  options?: UseAsyncReduxStateOptions
): AsyncReduxState => {
  const dispatch = useDispatch();
  // Stable ID for the hook instance
  const hookId = useMemo(() => uuidv4(), []);

  const defaultEmptyArgs = useMemo<unknown[]>(() => [], []);
  const inputArgs = options?.inputArgs ?? defaultEmptyArgs;

  const selectAsyncFunctionResult = useMemo(
    () => getSelectAsyncFunctionResult(functionId, inputArgs),
    [functionId, inputArgs]
  );

  const asyncFunctionResult = useSelector(selectAsyncFunctionResult);

  useEffect(() => {
    const shouldFetch =
      !asyncFunctionResult.isSuccess &&
      !asyncFunctionResult.isLoading &&
      !asyncFunctionResult.isError;

    // Request to be the current hook if not already
    if (shouldFetch && asyncFunctionResult._currentHookId === undefined) {
      dispatch(
        asyncStateSlice.actions.updateAsyncState({
          functionId,
          args: inputArgs,
          state: {
            ...asyncFunctionResult,
            _currentHookId: hookId,
          },
        })
      );
    }

    // Execute the async function if this hook is the current one
    if (shouldFetch && asyncFunctionResult._currentHookId === hookId) {
      dispatch(
        asyncStateSlice.actions.updateAsyncState({
          functionId,
          args: inputArgs,
          state: {
            ...asyncFunctionResult,
            isLoading: true,
          },
        })
      );

      asyncFunction(...inputArgs)
        // eslint-disable-next-line promise/prefer-await-to-then -- usage inside useEffect
        .then((result) =>
          dispatch(
            asyncStateSlice.actions.updateAsyncState({
              functionId,
              args: inputArgs,
              state: {
                data: result,
                currentData: result,
                isUninitialized: false,
                isFetching: false,
                isLoading: false,
                isSuccess: true,
                isError: false,
                error: undefined,
                _currentHookId: undefined,
              },
            })
          )
        )
        // eslint-disable-next-line promise/prefer-await-to-then -- usage inside useEffect
        .catch((error) =>
          dispatch(
            asyncStateSlice.actions.updateAsyncState({
              functionId,
              args: inputArgs,
              state: {
                data: undefined,
                currentData: undefined,
                isUninitialized: false,
                isFetching: false,
                isLoading: false,
                isSuccess: false,
                isError: true,
                error,
                _currentHookId: undefined,
              },
            })
          )
        );
    }
  }, [
    asyncFunction,
    dispatch,
    functionId,
    inputArgs,
    asyncFunctionResult.isLoading,
    asyncFunctionResult.isSuccess,
    asyncFunctionResult.isError,
    asyncFunctionResult._currentHookId,
  ]);

  return asyncFunctionResult;
};

// TODO: useLazyUseAsyncReduxState which returns a function to fetch the data when called, rather than on mount.

/* eslint-enable security/detect-object-injection -- re-enabling */
