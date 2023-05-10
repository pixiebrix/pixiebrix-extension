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

import LazyLocatorFactory from "@/services/locator";
import { expectContext } from "@/utils/expectContext";
import pMemoize from "p-memoize";

export const locator = new LazyLocatorFactory();

export default async function initLocator() {
  // Service locator cannot run in contentScript due to CSP and wanting to isolate local secrets.
  // Force use of background page to ensure there's a singleton locator instance across all frames/pages.
  expectContext(
    "background",
    "The service locator must run in the background worker"
  );

  console.debug("Eagerly initializing service locator");
  await locator.refresh();
}

async function _refreshServices({
  local = true,
  remote = true,
} = {}): Promise<void> {
  // Service locator cannot run in contentScript due to CSP and wanting to isolate local secrets.
  // Force use of background page to ensure there's a singleton locator instance across all frames/pages.
  expectContext(
    "background",
    "The service locator must run in the background worker"
  );

  if (remote && local) {
    await locator.refresh();
  } else if (remote) {
    await locator.refreshRemote();
  } else if (local) {
    await locator.refreshLocal();
  } else {
    // Prevent buggy call sites from silently causing issues
    throw new Error("Either local or remote must be set to true");
  }
}

/**
 * @see locateWithRetry
 */
// Memoize, because multiple elements on the page might be trying to access services
export const refreshServices = pMemoize(_refreshServices, {
  cacheKey: JSON.stringify,
});
