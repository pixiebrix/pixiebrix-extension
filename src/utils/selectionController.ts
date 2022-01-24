/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { getCommonAncestor } from "@/nativeEditor/infer";

/**
 * Get the HTMLElement corresponding to the current selection.
 *
 * Originally introduced to guess which HTML element the user right-clicked to trigger a context menu if PixieBrix
 * did not already have access to the page.
 *
 * @see setActiveElement
 */
export function guessSelectedElement(): HTMLElement | null {
  const selection = document.getSelection();
  if (selection?.rangeCount) {
    const start = selection.getRangeAt(0).startContainer.parentNode;
    const end = selection.getRangeAt(selection.rangeCount - 1).endContainer
      .parentNode;
    const node = getCommonAncestor(start, end);
    if (node instanceof HTMLElement) {
      return node;
    }

    return null;
  }

  return null;
}

/**
 * Overridable selection getter. Useful to allow the QuickBar to preserve the selection
 * https://github.com/pixiebrix/pixiebrix-extension/issues/2443
 */
let selectionOverride: Range | undefined;
const selectionController = {
  save(): void {
    selectionOverride = getSelection().getRangeAt(0);
  },
  restore(): void {
    if (!selectionOverride) {
      return;
    }

    const native = getSelection();
    native.removeAllRanges();
    native.addRange(selectionOverride);
    selectionOverride = undefined;
  },
  get(): string {
    return (selectionOverride ?? getSelection()).toString();
  },
};

export default selectionController;
