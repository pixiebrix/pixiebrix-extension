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

import {
  addAuthListener,
  removeAuthListener,
  isLinked,
} from "@/auth/authStorage";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";
import type { AsyncState } from "@/types/sliceTypes";

// NOTE: can't share subscribe methods across generators currently for useAsyncExternalStore because it maintains
// a map of subscriptions to state controllers. See https://github.com/pixiebrix/pixiebrix-extension/issues/7789
const subscribe = (callback: () => void) => {
  addAuthListener(callback);

  return () => {
    removeAuthListener(callback);
  };
};

/**
 * Hook to watch the isLinked state, and automatically update if extension becomes linked/unlinked.
 * @see isLinked
 */
function useLinkState(): AsyncState<boolean> {
  // Using useAsyncExternalStore shares state/async calls across components in the tree.
  // In the future, we might consider including the state in the Redux Store or React Context and gating
  // on the state being available. Given how fast the `isLinked` call should resolve in practice, there's
  // little benefit to exposing AsyncState for components to perform optimistic rendering on isLoading.
  return useAsyncExternalStore(subscribe, isLinked);
}

export default useLinkState;
