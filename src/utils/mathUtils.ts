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

type Rect = { width: number; height: number; x: number; y: number };

/**
 * Calculates the intersection of two rectangles and returns the result as a new rectangle.
 * If the inner box is outside the outer box, it will return a rectangle with zero area at the closest overlapping edge (if any).
 *
 * @param innerBox The first "inner" rectangle, which will be clipped or snapped to the outerBox.
 * @param outerBox The second "outer" rectangle, which defines the bounds of the innerBox.
 * @returns The intersection of the two rectangles, defined by an object with properties: x, y, width, height, top, left, bottom, right.
 */
export function snapWithin(innerBox: Rect, outerBox: Rect) {
  const outerBoxRight = outerBox.x + outerBox.width;
  const outerBoxBottom = outerBox.y + outerBox.height;
  const innerBoxRight = innerBox.x + innerBox.width;
  const innerBoxBottom = innerBox.y + innerBox.height;

  const left = Math.min(Math.max(innerBox.x, outerBox.x), outerBoxRight);
  const top = Math.min(Math.max(innerBox.y, outerBox.y), outerBoxBottom);
  const right = Math.max(Math.min(innerBoxRight, outerBoxRight), outerBox.x);
  const bottom = Math.max(Math.min(innerBoxBottom, outerBoxBottom), outerBox.y);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    top,
    left,
    bottom,
    right,
  };
}
