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

import { useSyncExternalStore } from "use-sync-external-store/shim";
import {
  getSnapshot,
  initManagedStorage,
  managedStorageStateChange,
} from "@/store/enterprise/managedStorage";
import { useEffect } from "react";
import type { ManagedStorageState } from "@/store/enterprise/managedStorageTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import { expectContext } from "@/utils/expectContext";

type HookState = {
  data: Nullishable<ManagedStorageState>;
  isLoading: boolean;
};

// NOTE: can't share subscribe methods across generators currently for useAsyncExternalStore because it maintains
// a map of subscriptions to state controllers. See https://github.com/pixiebrix/pixiebrix-extension/issues/7789
function subscribe(callback: () => void): () => void {
  expectContext("extension");

  managedStorageStateChange.add(callback);

  return () => {
    managedStorageStateChange.remove(callback);
  };
}

/**
 * React hook to get the current state of managed storage.
 */
function useManagedStorageState(): HookState {
  useEffect(() => {
    // `initManagedStorage` is wrapped in once, so safe to call from multiple locations in the tree.
    void initManagedStorage();
  }, []);

  const data = useSyncExternalStore(subscribe, getSnapshot);

  return {
    data,
    isLoading: data == null,
  };
}

export default useManagedStorageState;
