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

import { fetch } from "@/hooks/fetch";
import { ManagedOrganizationData } from "@/types/contract";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { isLinked } from "@/auth/token";
import { validateUUID } from "@/types/helpers";
import { UUID } from "@/types/stringTypes";

let authUrlPatterns: string[] = [];

async function getAuthUrlPatterns(organizationId: UUID) {
  try {
    const { auth_url_patterns } = await fetch<ManagedOrganizationData>(
      `/api/organizations/${organizationId}/managed-data/`,
    );
    return auth_url_patterns;
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Browser administrators can restrict access to certain urls for unauthenticated PixieBrix users via managed storage
 * `enforceAuthentication` and `managedOrganizationId` settings. Policies for specified urls are stored on the server.
 */
async function initRestrictUnauthenticatedUrlAccess(): Promise<void> {
  const { managedOrganizationId, enforceAuthentication } =
    await readManagedStorage();

  if (!enforceAuthentication || !managedOrganizationId) {
    return;
  }

  try {
    authUrlPatterns = await getAuthUrlPatterns(
      validateUUID(managedOrganizationId),
    );
  } catch (error) {
    reportError(
      new Error(`Unable to initialize restricted url access: ${error}`),
    );
  }

  if (authUrlPatterns.length === 0) {
    console.debug("No auth url patterns found, skipping url restriction");
  }

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isLinked()) {
      return;
    }

    authUrlPatterns.map((matchPattern) => {
      // TODO: Compare tab.url to matchPattern
    });
  });
}

export default initRestrictUnauthenticatedUrlAccess;
