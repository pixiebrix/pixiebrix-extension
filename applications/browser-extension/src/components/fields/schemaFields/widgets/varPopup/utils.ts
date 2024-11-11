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

import { type VirtualElement } from "@floating-ui/dom";
import { getCaretCoordinates } from "@/utils/textAreaUtils";
/**
 * Get a virtual element for the line that the caret is on.
 * Essentially a box that has the same position and dimensions as the line that the caret is on.
 * Used to position the floating UI menu.
 */
export function getSelectedLineVirtualElement(
  textarea: HTMLTextAreaElement | HTMLInputElement,
): VirtualElement {
  const inputRect = textarea.getBoundingClientRect();

  const { top: caretOffset, height: lineHeight } = getCaretCoordinates(
    textarea,
    textarea.selectionEnd ?? 0,
  );

  // The top margin + border space
  const computed = window.getComputedStyle(textarea);
  const topOffset =
    Number.parseInt(computed.borderTopWidth, 10) +
    Number.parseInt(computed.paddingTop, 10);

  const lineTop = caretOffset;
  const lineBottom = caretOffset + lineHeight;

  // Create a mock "reference object" for computePosition. We want the menu to appear around the input caret
  // rather than the textarea itself.
  return {
    getBoundingClientRect: () => ({
      width: inputRect.width,
      height: lineHeight,
      top: lineTop + inputRect.top - topOffset,
      right: inputRect.right,
      bottom: lineBottom + inputRect.top,
      left: inputRect.left,
      x: inputRect.left,
      y: lineTop + inputRect.top - topOffset,
    }),
  };
}
