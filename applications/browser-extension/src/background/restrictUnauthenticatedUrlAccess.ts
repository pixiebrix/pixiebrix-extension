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

import { type OrganizationAuthUrlPattern } from "@/types/contract";
import { readManagedStorage } from "../store/enterprise/managedStorage";
import { addAuthListener, isLinked } from "@/auth/authStorage";
import { validateUUID } from "@/types/helpers";
import { type UUID } from "@/types/stringTypes";
import { testMatchPatterns } from "@/bricks/available";
import { SessionValue } from "../mv3/SessionStorage";
import reportError from "../telemetry/reportError";
import type { Tabs } from "webextension-polyfill";
import { forEachTab } from "../utils/extensionUtils";
import { getApiClient } from "@/data/service/apiClient";
import { DEFAULT_SERVICE_URL } from "../urlConstants";
import { StorageItem } from "webext-storage";
import { API_PATHS } from "@/data/service/urlPaths";

const authUrlPatternCache = new SessionValue<string[]>(
  "authUrlPatterns",
  import.meta.url,
);

/**
 * A tab that had its navigation restricted.
 */
type RestrictedNavigationMetadata = {
  tabId: number;
  url: string;
};

/**
 * Most recent restricted URL and tab id to allow redirecting to the same URL once authenticated.
 * @since 1.8.9
 */
// Storing on a per-tab basis might be useful for cases where multiple tabs are redirected due to the extension
// becoming unlinked. But storing a single tab/URL is sufficient for the more common use case of a URL being restricted
// in a fresh environment prior to the SSO login.
// NOTE: can't use SessionValue because the extension reloads on extension linking, so SessionValue is reset.
// StorageItem uses local storage, so persists across extension reloads
const lastRestrictedNavigationStorage =
  new StorageItem<RestrictedNavigationMetadata>("lastRestrictedNavigation");

async function getAuthUrlPatterns(organizationId: UUID): Promise<string[]> {
  try {
    // Is an unauthenticated endpoint
    const client = await getApiClient();
    const { data: authUrlPatterns } = await client.get<
      OrganizationAuthUrlPattern[]
    >(API_PATHS.ORGANIZATION_AUTH_URL_PATTERNS(organizationId));
    return authUrlPatterns.map(({ url_pattern }) => url_pattern);
  } catch (error) {
    reportError(error);
    return [];
  }
}

async function isRestrictedUrl(url: string): Promise<boolean> {
  const cachedAuthUrlPatterns = await authUrlPatternCache.get();
  if (!cachedAuthUrlPatterns) {
    return false;
  }

  return testMatchPatterns(cachedAuthUrlPatterns, url);
}

function getDefaultAuthUrl(restrictedUrl: string) {
  const errorMessage = `Access is restricted to '${restrictedUrl}'. Log in with PixieBrix to proceed`;
  const defaultUrl = new URL("login", DEFAULT_SERVICE_URL);
  defaultUrl.searchParams.set("error", errorMessage);
  return defaultUrl.href;
}

async function getRedirectUrl(restrictedUrl: string) {
  const { ssoUrl } = await readManagedStorage();
  return ssoUrl ?? getDefaultAuthUrl(restrictedUrl);
}

async function redirectTabIfRestrictedUrl({
  tabId,
  url,
}: {
  tabId: number;
  url: string;
}) {
  if (await isRestrictedUrl(url)) {
    await lastRestrictedNavigationStorage.set({
      tabId,
      url,
    });

    await browser.tabs.update(tabId, {
      url: await getRedirectUrl(url),
    });
  }

  // There's post-login redirection corner case for lastRestrictedNavigationStorage in the following unusual sequence:
  // 1. User visits restricted URL
  // 2. They're redirected to the app login page
  // 3. User manually changes URL to visit an unrestricted URL
  // 4. User manually visits app login page and logs in
  // 5. User will be automatically redirected to original restricted URL

  // You could consider resetting lastRestrictedNavigationStorage on step 3. However, the problem though is that for
  // SSO flows, the user will visit one or more unrestricted URLs. It's non-trivial to distinguish navigation events
  // that are part of an SSO/OpenID flow vs. the user deciding to "abort" the login flow.
  // For more discussion, see https://github.com/pixiebrix/pixiebrix-extension/pull/7625#discussion_r1491407499
}

async function handleRestrictedTab(
  tabId: number,
  changeInfo: Tabs.OnUpdatedChangeInfoType,
) {
  if (!changeInfo.url) {
    return;
  }

  await redirectTabIfRestrictedUrl({ tabId, url: changeInfo.url });
}

/**
 * Open the restricted URL that was most recently accessed causing the user to be redirected to a login page, if any.
 */
async function openLatestRestrictedUrl(): Promise<void> {
  const lastRestrictedNavigation = await lastRestrictedNavigationStorage.get();

  if (!lastRestrictedNavigation) {
    return;
  }

  await lastRestrictedNavigationStorage.remove();

  const { tabId, url } = lastRestrictedNavigation;

  // Double-check the tab still exists
  const tab = await browser.tabs.get(tabId);
  if (tab) {
    await browser.tabs.update(tabId, {
      url,
      active: true,
    });
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

  // Clean up the lastRestrictedNavigationStorage when its tab is closed.
  // Could just rely on tab existing in openLatestRestrictedUrl, but explicitly clearing is more robust to tab id reuse.
  browser.tabs.onRemoved.addListener(async (tabId) => {
    const lastRestrictedNavigation =
      await lastRestrictedNavigationStorage.get();
    if (lastRestrictedNavigation?.tabId === tabId) {
      await lastRestrictedNavigationStorage.remove();
    }
  });

  addAuthListener(async (auth) => {
    if (auth) {
      // Be sure to remove the listener before accessing the URL again because the listener doesn't check isLinked
      browser.tabs.onUpdated.removeListener(handleRestrictedTab);
      await openLatestRestrictedUrl();
    } else {
      await forEachTab(redirectTabIfRestrictedUrl);
      browser.tabs.onUpdated.addListener(handleRestrictedTab);
    }
  });
}

export default initRestrictUnauthenticatedUrlAccess;
