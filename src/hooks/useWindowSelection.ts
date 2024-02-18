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
import type { Nullishable } from "@/utils/nullishUtils";

function subscribe(callback: () => void) {
  window.addEventListener("selectionchange", callback, { passive: true });
  return () => {
    window.removeEventListener("selectionchange", callback);
  };
}

function getSnapshot(): Nullishable<Selection> {
  return window.getSelection();
}

/**
 * Utility hook to watch for changes to the window selection.
 * @since 1.8.10
 */
function useWindowSelection(): Nullishable<Selection> {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export default useWindowSelection;
