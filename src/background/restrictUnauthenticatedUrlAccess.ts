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

import { type OrganizationAuthUrlPattern } from "@/types/contract";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { addListener as addAuthListener, isLinked } from "@/auth/token";
import { validateUUID } from "@/types/helpers";
import { type UUID } from "@/types/stringTypes";
import { testMatchPatterns } from "@/bricks/available";
import { SessionValue } from "@/mv3/SessionStorage";
import reportError from "@/telemetry/reportError";
import type { Tabs } from "webextension-polyfill";
import { forEachTab } from "@/utils/extensionUtils";
import { getApiClient } from "@/services/apiClient";
import { DEFAULT_SERVICE_URL } from "@/urlConstants";
import type { Nullishable } from "@/utils/nullishUtils";
import { StorageItem } from "webext-storage";

const authUrlPatternCache = new SessionValue<string[]>(
  "authUrlPatterns",
  import.meta.url,
);

/**
 * Most recent restricted URL to allow redirecting to the same URL once authenticated.
 * @since 1.8.9
 */
// Storing on a per-tab basis might be useful for cases where multiple tabs are redirected due to the extension
// becoming unlinked. But storing a single URL is sufficient for the more common use case of a URL being restricted
// in a fresh environment prior to the SSO login.
// NOTE: can't use SessionValue because the background worker reloads on extension linking
const lastRestrictedUrlStorage = new StorageItem("lastRestrictedUrl", {
  defaultValue: null as Nullishable<string>,
});

async function getAuthUrlPatterns(organizationId: UUID): Promise<string[]> {
  try {
    // Is an unauthenticated endpoint
    const client = await getApiClient();
    const { data: authUrlPatterns } = await client.get<
      OrganizationAuthUrlPattern[]
    >(`/api/organizations/${organizationId}/auth-url-patterns/`);
    return authUrlPatterns.map(({ url_pattern }) => url_pattern);
  } catch (error) {
    reportError(error);
    return [];
  }
}

async function isRestrictedUrl(url: string): Promise<boolean> {
  const cachedAuthUrlPatterns = await authUrlPatternCache.get();
  return testMatchPatterns(cachedAuthUrlPatterns, url);
}

function getDefaultAuthUrl(restrictedUrl: string) {
  const errorMessage = `Access is restricted to '${restrictedUrl}'. Log in with PixieBrix to proceed`;
  const defaultUrl = new URL("https://app.pixiebrix.com/login/");
  defaultUrl.searchParams.set("error", errorMessage);
  return defaultUrl.href;
}

async function getRedirectUrl(restrictedUrl: string) {
  const { ssoUrl } = await readManagedStorage();
  return ssoUrl ?? getDefaultAuthUrl(restrictedUrl);
}

async function redirectRestrictedTab({
  tabId,
  url,
}: {
  tabId: number;
  url: string;
}) {
  if (await isRestrictedUrl(url)) {
    await lastRestrictedUrlStorage.set(url);

    await browser.tabs.update(tabId, {
      url: await getRedirectUrl(url),
    });
  }
}

async function handleRestrictedTab(
  tabId: number,
  changeInfo: Tabs.OnUpdatedChangeInfoType,
) {
  if (!changeInfo.url) {
    return;
  }

  await redirectRestrictedTab({ tabId, url: changeInfo.url });
}

/**
 * Open the restricted URL that was most recently accessed causing the user to be redirected to a login page, if any.
 */
async function openLatestRestrictedUrl(): Promise<void> {
  const redirectUrl = await lastRestrictedUrlStorage.get();

  if (!redirectUrl) {
    return;
  }

  await lastRestrictedUrlStorage.remove();

  const appTabs = await browser.tabs.query({
    url: [`${new URL(DEFAULT_SERVICE_URL).href}/*`],
    active: true,
  });

  // Redirect the active Admin Console tab to the restricted URL. That will be the tab that linked the extension
  // Open redirection is considered a vulnerability. However, this isn't a case of open redirection because:
  // 1) the user already accessed the URL, and 2) the restricted URL list is maintained by the team admin
  const activeAppTab = appTabs[0];
  if (activeAppTab) {
    await browser.tabs.update(activeAppTab.id, {
      url: redirectUrl,
      active: true,
    });
  } else {
    await browser.tabs.create({ url: redirectUrl, active: true });
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
    const authUrlPatterns = await getAuthUrlPatterns(
      validateUUID(managedOrganizationId),
    );

    if (authUrlPatterns.length === 0) {
      console.debug("No auth url patterns found, skipping url restriction");
      return;
    }

    await authUrlPatternCache.set(authUrlPatterns);
  } catch (error) {
    reportError(error);
  }

  if (!(await isLinked())) {
    browser.tabs.onUpdated.addListener(handleRestrictedTab);
  }

  addAuthListener(async (auth) => {
    if (auth) {
      // Be sure to remove the listener before accessing the URL again because the listener doesn't check isLinked
      browser.tabs.onUpdated.removeListener(handleRestrictedTab);
      await openLatestRestrictedUrl();
    } else {
      await forEachTab(redirectRestrictedTab);
      browser.tabs.onUpdated.addListener(handleRestrictedTab);
    }
  });
}

export default initRestrictUnauthenticatedUrlAccess;
