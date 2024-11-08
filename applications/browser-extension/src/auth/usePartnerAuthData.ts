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
  getPartnerAuthData,
  removeAuthListener,
} from "@/auth/authStorage";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";
import type { AsyncState } from "@/types/sliceTypes";
import type { PartnerAuthData } from "@/auth/authTypes";

// NOTE: can't share subscribe methods across generators currently for useAsyncExternalStore because it maintains
// a map of subscriptions to state controllers. See https://github.com/pixiebrix/pixiebrix-extension/issues/7789
const subscribe = (callback: () => void) => {
  addAuthListener(callback);

  return () => {
    removeAuthListener(callback);
  };
};

/**
 * Use the current partner auth data. Automatically listens for changes and updates the state.
 * @see getPartnerAuthData
 */
function usePartnerAuthData(): AsyncState<PartnerAuthData | undefined> {
  return useAsyncExternalStore(subscribe, getPartnerAuthData);
}

export default usePartnerAuthData;
