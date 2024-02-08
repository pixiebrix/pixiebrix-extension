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

const sessionValue = new SessionValue<string[]>(
  "authUrlPatterns",
  import.meta.url,
);

async function getAuthUrlPatterns(organizationId: UUID): Promise<string[]> {
  try {
    const authUrlPatterns = await fetch<OrganizationAuthUrlPattern[]>(
      `/api/organizations/${organizationId}/auth-url-patterns/`,
    );
    return authUrlPatterns.map(({ url_pattern }) => url_pattern);
  } catch (error) {
    reportError(error);
    return [];
  }
}

async function isRestrictedUrl(url: string) {
  const cachedAuthUrlPatterns = await sessionValue.get();
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

    await sessionValue.set(authUrlPatterns);
  } catch (error) {
    reportError(error);
  }

  if (!(await isLinked())) {
    browser.tabs.onUpdated.addListener(handleRestrictedTab);
  }

  addAuthListener(async (auth) => {
    if (auth) {
      browser.tabs.onUpdated.removeListener(handleRestrictedTab);
    } else {
      await forEachTab(redirectRestrictedTab);
      browser.tabs.onUpdated.addListener(handleRestrictedTab);
    }
  });
}

export default initRestrictUnauthenticatedUrlAccess;
