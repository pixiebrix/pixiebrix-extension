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

import { getCommonAncestor } from "./inference/selectorInference";
import { getSelectionRange } from "./domUtils";

export function getSelection(): Selection {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Firefox-only iframe-only "null"
  return window.getSelection()!;
}

/**
 * Get the HTMLElement corresponding to the current selection.
 *
 * Originally introduced to guess which HTML element the user right-clicked to trigger a context menu if PixieBrix
 * did not already have access to the page.
 *
 * @see setActiveElement
 */
export function guessSelectedElement(): HTMLElement | null {
  const range = getSelectionRange();
  if (!range) {
    return null;
  }

  const start = range.startContainer.parentElement ?? document.documentElement;
  const end = range.endContainer.parentElement ?? document.documentElement;
  return getCommonAncestor(start, end);
}

/**
 * Overridable selection getter. Useful to allow the QuickBar to preserve the selection
 * https://github.com/pixiebrix/pixiebrix-extension/issues/2443
 */
let selectionOverride: Range | undefined;
// eslint-disable-next-line local-rules/persistBackgroundData -- Not used there
const selectionController = {
  save(): void {
    // It must be set to "undefined" even if there are no selections
    selectionOverride = getSelectionRange();
  },
  restore(): void {
    selectionController.restoreWithoutClearing();
    selectionController.clear();
  },

  restoreWithoutClearing(): void {
    if (!selectionOverride) {
      return;
    }

    const native = getSelection();
    native.removeAllRanges();
    native.addRange(selectionOverride);
  },
  get(): string {
    return (selectionOverride ?? getSelection()).toString();
  },

  /** Clear saved value without restoring focus */
  clear(): void {
    selectionOverride = undefined;
  },
} as const;

export default selectionController;
