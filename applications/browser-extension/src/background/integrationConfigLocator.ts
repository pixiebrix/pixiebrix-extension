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

import IntegrationConfigLocator from "../integrations/integrationConfigLocator";
import { expectContext } from "../utils/expectContext";
import { memoizeUntilSettled } from "../utils/promiseUtils";

/**
 * Singleton IntegrationConfigLocator instance.
 */
export const integrationConfigLocator = new IntegrationConfigLocator();

export default async function initLocator() {
  // IntegrationConfigLocator cannot run in contentScript due to CSP and wanting to isolate local secrets.
  // Force use of background page to ensure there's a singleton locator instance across all frames/pages.
  expectContext(
    "background",
    "The integration configuration locator must run in the background worker",
  );

  console.debug("Eagerly initializing integration configuration locator");
  await integrationConfigLocator.refresh();
}

async function _refreshIntegrationConfigs({
  local = true,
  remote = true,
} = {}): Promise<void> {
  // Integration configuration locator cannot run in contentScript due to CSP and wanting to isolate local secrets.
  // Force use of background page to ensure there's a singleton locator instance across all frames/pages.
  expectContext(
    "background",
    "The integration configuration locator must run in the background worker",
  );

  if (remote && local) {
    await integrationConfigLocator.refresh();
  } else if (remote) {
    await integrationConfigLocator.refreshRemote();
  } else if (local) {
    await integrationConfigLocator.refreshLocal();
  } else {
    // Prevent buggy call sites from silently causing issues
    throw new Error("Either local or remote must be set to true");
  }
}

/**
 * Sync local and remote service configurations.
 * @see locateWithRetry
 */
// Memoize while running, because multiple elements on the page might be trying to refresh services. But can't
// memoize completely, as that would prevent future refreshes
export const refreshIntegrationConfigs = memoizeUntilSettled(
  _refreshIntegrationConfigs,
  {
    cacheKey: JSON.stringify,
  },
);
