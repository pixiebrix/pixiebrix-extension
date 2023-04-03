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

import { useSyncExternalStore } from "use-sync-external-store/shim";
import {
  getSnapshot,
  initManagedStorage,
  subscribe,
} from "@/store/enterprise/managedStorage";
import { useEffect } from "react";
import { type ManagedStorageState } from "@/store/enterprise/managedStorageTypes";

type HookState = {
  data: ManagedStorageState | undefined;
  isLoading: boolean;
};

/**
 * React hook to get the current state of managed storage.
 */
function useManagedStorageState(): HookState {
  useEffect(() => {
    initManagedStorage();
  }, []);

  const data = useSyncExternalStore(subscribe, getSnapshot);

  return {
    data,
    isLoading: data == null,
  };
}

export default useManagedStorageState;
