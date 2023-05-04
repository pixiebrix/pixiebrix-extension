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

import { type AsyncState } from "@/types/sliceTypes";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { memoizeUntilSettled } from "@/utils";
import {
  errorToAsyncState,
  loadingAsyncStateFactory,
  uninitializedAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";

type Subscribe = (callback: () => void) => () => void;
const stateControllerMap = new Map<Subscribe, StateController>();

class StateController<T = unknown> {
  private readonly stateListeners = new Set<() => void>();
  private state: AsyncState<T> = uninitializedAsyncStateFactory();

  // Methods to pass to useSyncExternalStore
  readonly boundSubscribe: Subscribe;
  readonly boundGetSnapshot: () => AsyncState<T>;

  constructor(
    readonly externalSubscribe: Subscribe,
    readonly factory: () => Promise<T>
  ) {
    console.debug("StateController:initialize");
    this.boundSubscribe = this.internalSubscribe.bind(this);
    this.boundGetSnapshot = this.getSnapshot.bind(this);

    // Subscribe to the external source and load the initial state
    const memoizedUpdate = memoizeUntilSettled(this.updateSnapshot.bind(this));
    externalSubscribe(memoizedUpdate);
    void memoizedUpdate();
  }

  internalSubscribe(callback: () => void): () => void {
    this.stateListeners.add(callback);

    return () => {
      // Theoretically, we could also try unsubscribing from the external source when the last listener is removed.
      // However, in practice that was causing some bugs with component lifecycle.
      this.stateListeners.delete(callback);
    };
  }

  notifyAll(): void {
    for (const listener of this.stateListeners) {
      listener();
    }
  }

  async updateSnapshot(): Promise<void> {
    this.state = this.state.isUninitialized
      ? loadingAsyncStateFactory()
      : {
          ...this.state,
          isFetching: true,
          currentData: undefined,
        };

    // Inform subscribers of loading/fetching state
    this.notifyAll();

    try {
      const data = await this.factory();
      this.state = valueToAsyncState(data);
    } catch (error) {
      this.state = errorToAsyncState(error);
    }

    this.notifyAll();
  }

  getSnapshot(): AsyncState<T> {
    return this.state;
  }
}

/**
 * A version of useSyncExternalStore that returns a standard AsyncState.
 * @see useSyncExternalStore
 * @see useAsyncState
 */
function useAsyncExternalStore<T>(
  subscribe: Subscribe,
  factory: () => Promise<T>
): AsyncState<T> {
  if (!stateControllerMap.has(subscribe)) {
    stateControllerMap.set(subscribe, new StateController(subscribe, factory));
  }

  const controller = stateControllerMap.get(subscribe);

  return useSyncExternalStore(
    controller.boundSubscribe,
    controller.boundGetSnapshot
  ) as AsyncState<T>;
}

export default useAsyncExternalStore;
