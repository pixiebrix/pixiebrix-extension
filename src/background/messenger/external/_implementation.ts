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

/**
 * @file THIS FILE IS MEANT TO BE IMPORTED EXCLUSIVELY BY ./api.js
 */

import { linkExtension } from "@/auth/token";
import { TokenAuthData } from "@/auth/authTypes";
import { reportEvent } from "@/telemetry/events";

export async function setExtensionAuth(auth: TokenAuthData) {
  const updated = await linkExtension(auth);
  if (updated) {
    reportEvent("LinkExtension");

    // A hack to ensure the SET_EXTENSION_AUTH response flows to the front-end before the backend
    // page is reloaded.
    setTimeout(async () => {
      browser.runtime.reload();
    }, 100);
  }

  return updated;
}

type OpenOptionsOptions = {
  /**
   * True to open the extension in a new tab, false to replace the current tab (default=True)
   */
  newTab?: boolean;
};

export async function openMarketplace({ newTab = true }: OpenOptionsOptions) {
  const baseUrl = browser.runtime.getURL("options.html");

  const url = `${baseUrl}#/marketplace`;

  if (newTab) {
    await browser.tabs.create({ url, active: true });
  } else {
    await browser.tabs.update({ url });
  }

  return true;
}

type ActivateBlueprintOptions = {
  /**
   * The blueprint to activate
   */
  blueprintId: string;

  /**
   * True to open the extension in a new tab, false to replace the current tab (default=True)
   */
  newTab?: boolean;

  /**
   * The "source" page to associate with the activation. This affects the wording in the ActivateWizard
   * component
   */
  pageSource?: "marketplace";
};

export async function openActivateBlueprint({
  blueprintId,
  newTab = true,
}: ActivateBlueprintOptions) {
  const baseUrl = browser.runtime.getURL("options.html");
  const url = `${baseUrl}#/marketplace/activate/${encodeURIComponent(
    blueprintId
  )}`;

  reportEvent("ExternalActivate", {
    blueprintId,
    // We used to have multiple sources: template vs. marketplace. However we got rid of "templates" as a separate
    // pageSource. Keep for now for analytics consistency
    pageSource: "marketplace",
  });

  if (newTab) {
    await browser.tabs.create({ url });
  } else {
    await browser.tabs.update({ url });
  }

  return true;
}

export async function openExtensionOptions() {
  await browser.runtime.openOptionsPage();
  return true;
}
