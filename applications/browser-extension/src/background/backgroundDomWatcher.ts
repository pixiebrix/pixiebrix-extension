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

import { isBackgroundPage } from "webext-detect";

/** @file DO NOT alter this file to add an "init" function because it must be executed as early as possible */
if (isBackgroundPage()) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      console.error(
        "Detected added node, this won't work in MV3:",
        ...mutation.addedNodes,
      );
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}
