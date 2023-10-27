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

import { forbidContext } from "@/utils/expectContext";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The build fails without this
const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID!;
const CHROME_EXTENSION_STORAGE_KEY = "chrome_extension_id";

// Used only in the app
export function setChromeExtensionId(extensionId = ""): void {
  forbidContext("extension");

  extensionId = extensionId.trim();
  if (extensionId) {
    localStorage.removeItem(CHROME_EXTENSION_STORAGE_KEY);
  } else {
    localStorage.setItem(CHROME_EXTENSION_STORAGE_KEY, extensionId);
  }
}

// Used only in the app
export function getChromeExtensionId(): string {
  forbidContext("extension");

  return (
    localStorage.getItem(CHROME_EXTENSION_STORAGE_KEY) ?? CHROME_EXTENSION_ID
  );
}
