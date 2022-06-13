/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { UnknownObject } from "@/types";
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
  path: string
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

  throw new Error("Expected invalid path");
}
