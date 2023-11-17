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
import {
  errorToAsyncState,
  loadingAsyncStateFactory,
  uninitializedAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import { type UUID } from "@/types/stringTypes";
import { uuidv4 } from "@/types/helpers";
import deepEquals from "fast-deep-equal";

type Subscribe = (callback: () => void) => () => void;

class StateController<T = unknown> {
  private readonly stateListeners = new Set<() => void>();
  private state: AsyncState<T> = uninitializedAsyncStateFactory();

  // @ts-expect-error "Property 'nonce' has no initializer and is not definitely assigned in the constructor." -- But it is!
  private nonce: UUID;

  constructor(
    readonly externalSubscribe: Subscribe,
    readonly factory: () => Promise<T>
  ) {
    externalSubscribe(this.updateSnapshot.bind(this));
    void this.updateSnapshot();
  }

  subscribe = (callback: () => void): (() => void) => {
    this.stateListeners.add(callback);

    return () => {
      // Theoretically, we could also try unsubscribing from the external source when the last listener is removed.
      // However, in practice that was causing some bugs with component lifecycle.
      this.stateListeners.delete(callback);
    };
  };

  notifyAll(): void {
    for (const listener of this.stateListeners) {
      listener();
    }
  }

  updateSnapshot = async (): Promise<void> => {
    this.state = this.state.isUninitialized
      ? loadingAsyncStateFactory()
      : {
          ...this.state,
          isFetching: true,
          currentData: undefined,
        };

    const nonce = uuidv4();
    this.nonce = nonce;

    // Inform subscribers of loading/fetching state
    this.notifyAll();

    try {
      const data = await this.factory();

      if (nonce !== this.nonce) {
        // Stale response
        return;
      }

      // Preserve reference equality if possible
      const nextData = deepEquals(data, this.state.currentData)
        ? this.state.currentData
        : data;
      this.state = valueToAsyncState(nextData);
    } catch (error) {
      if (nonce !== this.nonce) {
        // Stale response
        return;
      }

      this.state = errorToAsyncState(error);
    }

    this.notifyAll();
  };

  getSnapshot(): AsyncState<T> {
    return this.state;
  }
}

const stateControllerMap = new Map<Subscribe, StateController>();

/**
 * Test helper method to reset the state of all useAsyncExternalStore hooks.
 */
export function INTERNAL_reset(): void {
  stateControllerMap.clear();
}

/**
 * A version of useSyncExternalStore that accepts an async snapshot function and returns an AsyncState.
 * @param subscribe see docs for useSyncExternalStore
 * @param factory an async function that returns the current snapshot of the external store
 * @see useSyncExternalStore
 * @see useAsyncState
 */
function useAsyncExternalStore<T>(
  subscribe: Subscribe,
  factory: () => Promise<T>
): AsyncState<T> {
  const controller =
    stateControllerMap.get(subscribe) ??
    new StateController(subscribe, factory);
  stateControllerMap.set(subscribe, controller);

  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  ) as AsyncState<T>;
}

export default useAsyncExternalStore;
