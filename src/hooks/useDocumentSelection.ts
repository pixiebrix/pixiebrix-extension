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

// Using the string instead of the Selection object because the reference didn't seem to change on getSelection
type TextSelection = string;

function subscribe(callback: () => void) {
  // Use document vs. window because window.selectionchange wasn't firing reliably
  document.addEventListener("selectionchange", callback, { passive: true });
  return () => {
    document.removeEventListener("selectionchange", callback);
  };
}

function getSnapshot(): Nullishable<TextSelection> {
  return document.getSelection()?.toString();
}

/**
 * Utility hook to watch for changes to the window selection.
 * @since 1.8.10
 */
function useDocumentSelection(): Nullishable<TextSelection> {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export default useDocumentSelection;
