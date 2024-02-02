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
import { type ManagedOrganizationData } from "@/types/contract";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { isLinked } from "@/auth/token";
import { validateUUID } from "@/types/helpers";
import { type UUID } from "@/types/stringTypes";
import { testMatchPatterns } from "@/bricks/available";
import { SessionValue } from "@/mv3/SessionStorage";

const sessionValue = new SessionValue<string[]>(
  "authUrlPatterns",
  import.meta.url,
);

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
  const { managedOrganizationId, enforceAuthentication, ssoUrl } =
    await readManagedStorage();

  if (!enforceAuthentication || !managedOrganizationId) {
    return;
  }

  console.log("*** getting auth url patterns)");

  try {
    const authUrlPatterns = await getAuthUrlPatterns(
      validateUUID(managedOrganizationId),
    );

    if (authUrlPatterns.length === 0) {
      console.debug("No auth url patterns found, skipping url restriction");
      return;
    }

    await sessionValue.set(authUrlPatterns);
  } catch (error) {
    reportError(error);
  }

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (await isLinked()) {
      return;
    }

    const cachedAuthUrlPatterns = await sessionValue.get();
    const isRestrictedUrl = testMatchPatterns(
      cachedAuthUrlPatterns,
      tab?.url ?? "",
    );

    if (isRestrictedUrl) {
      const errorMessage = `Access is restricted to '${tab.url}'. Log in with PixieBrix to proceed`;
      const defaultUrl = new URL("https://app.pixiebrix.com/login/");
      defaultUrl.searchParams.set("error", errorMessage);
      await browser.tabs.update(tabId, {
        url: ssoUrl ?? defaultUrl.href,
      });
    }
  });
}

export default initRestrictUnauthenticatedUrlAccess;
