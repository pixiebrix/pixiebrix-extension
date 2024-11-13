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

import { getIn } from "formik";

type InvalidPathInformation = {
  invalidPath: string;
  values: unknown;
};

/**
 * Return which part of the key/path is invalid for a call to lodash's getIn
 * @param value the value
 * @param path period separated path
 */
export function getInvalidPath(
  value: UnknownObject,
  path: string,
): InvalidPathInformation {
  const parts = path.split(".");

  for (let i = 0; i < parts.length; i++) {
    const partialPath = parts.slice(0, i + 1).join(".");
    if (getIn(value, partialPath) == null) {
      return {
        invalidPath: partialPath,
        values: getIn(value, parts.slice(0, i).join(".")),
      };
    }
  }

  return { invalidPath: "", values: {} };
}

/**
 * @knip debugging util
 * A debug util for drawing a rectangle on the screen. Useful for debugging
 * positioning issues related to dom bounding boxes (such as tooltips and popovers like
 * `src/contentScript/textSelectionMenu/selectionMenuController.tsx`).
 */
export function drawRectangle({
  x,
  y,
  width,
  height,
  color,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}) {
  const rect = document.createElement("div");
  rect.style.position = "absolute";
  rect.style.left = x + window.scrollX + "px";
  rect.style.top = y + window.scrollY + "px";
  rect.style.width = width + "px";
  rect.style.height = height + "px";
  rect.style.border = `2px solid ${color || "red"}`;
  rect.style.zIndex = Number.MAX_SAFE_INTEGER.toString();
  document.body.append(rect);
}
