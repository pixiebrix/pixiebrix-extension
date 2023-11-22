import { createSlice, type PayloadAction, type Slice } from "@reduxjs/toolkit";
import { type AsyncState } from "@/types/sliceTypes";
import { errorToAsyncState, uninitializedAsyncStateFactory, valueToAsyncState } from "@/utils/asyncStateUtils";
import { type UUID } from "@/types/stringTypes";
import { useSelector, useDispatch } from "react-redux";
import { uuidv4 } from "@/types/helpers";
import deepEquals from "fast-deep-equal";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useAsyncEffect } from "use-async-effect";


type Subscribe = (callback: () => void) => () => void;

function createAsyncStateReduxSlice<T>(sliceName: string): Slice<AsyncState<T>> {
  // TODO(interview note) - should move this + the createSlice in
  // useAsyncState.ts into a utility file, not doing that here
  // to keep the PR simple.
  return createSlice({
    name: sliceName,
    initialState: uninitializedAsyncStateFactory(),
    reducers: {
      initialize(state) {
        // Initialize loading state
        state.isUninitialized = false;
        state.isFetching = true;
        state.isLoading = true;
      },
      startFetchNewInputs(state) {
        // Start fetching for new inputs. Clears currentData because the inputs changed
        state.isFetching = true;
        state.currentData = undefined;
      },
      startRefetch(state) {
        // Start fetching for the same inputs. Keeps currentData because the inputs didn't change
        state.isFetching = true;
      },
      success(state, action: PayloadAction<{ data: unknown }>) {
        const { data } = action.payload;
  
        state.isLoading = false;
        state.isFetching = false;
        state.data = data;
        state.currentData = data;
        state.isError = false;
        state.isSuccess = true;
        state.error = undefined;
      },
      failure(state, action: PayloadAction<{ error: unknown }>) {
        state.isLoading = false;
        state.isFetching = false;
        state.data = undefined;
        state.isError = true;
        state.isSuccess = false;
        state.error = action.payload.error ?? new Error("Error producing data");
      },
    },
  })
}

class StateController<T = unknown> {
  private readonly stateListeners = new Set<() => void>();
  private readonly slice: Slice<AsyncState<T>>;
  private readonly state: AsyncState<T>;
  private nonce: UUID;

  private readonly dispatch = useDispatch();

  // Methods to pass to useSyncExternalStore
  readonly boundSubscribe: Subscribe;
  readonly boundGetSnapshot: () => AsyncState<T>;

  constructor(
    readonly externalSubscribe: Subscribe,
    readonly factory: () => Promise<T>,
    state: AsyncState<T>,
    sliceName: string,
  ) {
    this.boundSubscribe = this.internalSubscribe.bind(this);
    this.boundGetSnapshot = this.getSnapshot.bind(this);
    externalSubscribe(this.updateSnapshot.bind(this));
    this.slice = createAsyncStateReduxSlice<T>(sliceName);
    this.state = state[sliceName];
    void this.updateSnapshot();
  }

  internalSubscribe(callback: () => void): () => void {
    this.stateListeners.add(callback);

    return () => {
      this.stateListeners.delete(callback);
    };
  }

  notifyAll(): void {
    for (const listener of this.stateListeners) {
      listener()
    }
  }

  async updateSnapshot(): Promise<void> {
    if (this.state.isUninitialized) {
      this.dispatch(this.slice.actions.initialize());
    } else {
      this.dispatch(this.slice.actions.startFetchNewInputs());
    }

    const nonce = uuidv4();
    this.nonce = nonce;

    this.notifyAll();

    try {
      const data = await this.factory();

      if (nonce !== this.nonce) {
        return;
      }

      // Preserve reference equality if possible
      const nextData = deepEquals(data, this.state.currentData)
        ? this.state.currentData
        : data;
      this.dispatch(this.slice.actions.success({data: valueToAsyncState(nextData)}));
    } catch (error) {
      if (nonce !== this.nonce) {
        return;
      }

      this.dispatch(this.slice.actions.failure({ error: errorToAsyncState(error)}));
    }

    this.notifyAll();
  }

  getSnapshot(): AsyncState<T> {
    return this.state;
  }
}

const stateControllerMap = new Map<string, StateController>;

/**
 * Hook to asynchronously compute a value, store it in redux, and return the state.
 * 
 * 
 * @param subscribe see docs for useSyncExternalStore
 * @param factory an async function that returns the current snapshot of the external store
 * @param sliceName the redux slice name to use
 * @param dependencies if the factory accepts parameters, pass them here
 * @see useSyncExternalStore
 * @see useAsyncExternalStore
 */
function useAsyncReduxStore<T>(
  subscribe: Subscribe,
  factory: () => Promise<T>,
  sliceName: string,
  dependencies: unknown[],
): AsyncState<T> {
  const state = useSelector(state => state[sliceName])
  console.log(state);
  if (!stateControllerMap.has(sliceName)) {
    stateControllerMap.set(sliceName, new StateController<T>(subscribe, factory, state, sliceName))
  }

  const controller = stateControllerMap.get(sliceName);

  useAsyncEffect(async () => {
    await controller.updateSnapshot()
  }, [...dependencies, sliceName]);
  
  return useSyncExternalStore(
    controller.boundSubscribe,
    controller.boundGetSnapshot
  ) as AsyncState<T>;
}

export default useAsyncReduxStore;