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

interface Coordinates {
  top: number;
  left: number;
}

/**
 * Get the caret coordinates in a textarea in pixels.
 * @param element
 * @param position
 */
export function getTextareaCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number,
): Coordinates {
  const div = document.createElement("div");
  const span = document.createElement("span");
  const computedStyle = getComputedStyle(element);

  // Create a mirror div, and style it so that it doesn't actually appear on the screen
  div.style.position = "absolute";
  div.style.top = `${element.scrollTop}px`;
  div.style.left = "-9999px";
  div.style.width = computedStyle.width;
  div.style.height = computedStyle.height;
  div.style.font = computedStyle.font;
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  div.style.overflowY = "auto";

  // Append it to the body
  document.body.append(div);

  // Set its text content up to the caret position to mimic the input's text up to the caret
  div.textContent = element.value.slice(0, Math.max(0, position));

  // Create a span and insert it at the end to get the caret position
  span.textContent = element.value.slice(Math.max(0, position)) || ".";
  div.append(span);

  // Get caret coordinates
  const coordinates: Coordinates = {
    top: span.offsetTop,
    left: span.offsetLeft,
  };

  // Clean up
  div.remove();

  return coordinates;
}
