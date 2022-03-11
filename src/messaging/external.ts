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
 * API for the PixieBrix app to talk to the browser extension.
 */
import { linkExtension } from "@/auth/token";
import { TokenAuthData } from "@/auth/authTypes";
import { liftBackground } from "@/background/protocol";
import { liftExternal } from "@/contentScript/externalProtocol";
import { isFirefox } from "webext-detect-page";
import { reportEvent } from "@/telemetry/events";

const lift = isFirefox() ? liftExternal : liftBackground;

export const connectPage = lift("CONNECT_PAGE", async () =>
  // `browser.runtimes`'s types don't include the whole manifest. Use the chrome namespace to get the full type
  chrome.runtime.getManifest()
);

const _reload = liftBackground("BACKGROUND_RELOAD", async () => {
  browser.runtime.reload();
});

// Called by PixieBrix app
export const setExtensionAuth = lift(
  "SET_EXTENSION_AUTH",
  async (auth: TokenAuthData) => {
    const updated = await linkExtension(auth);
    if (updated) {
      reportEvent("LinkExtension");

      // A hack to ensure the SET_EXTENSION_AUTH response flows to the front-end before the backend
      // page is reloaded, causing the message port to close.
      setTimeout(async () => {
        await _reload();
      }, 100);
    }

    return updated;
  }
);

// `runtime.openOptionsPage` is only available in the background page
const _openOptions = liftBackground("BACKGROUND_OPEN_OPTIONS", async () => {
  await browser.runtime.openOptionsPage();
  return true;
});

type OpenOptionsOptions = {
  /**
   * True to open the extension in a new tab, false to replace the current tab (default=True)
   */
  newTab?: boolean;
};

const _openMarketplace = liftBackground(
  "BACKGROUND_OPEN_MARKETPLACE",
  async ({ newTab = true }: OpenOptionsOptions) => {
    const baseUrl = browser.runtime.getURL("options.html");

    const url = `${baseUrl}#/marketplace`;

    if (newTab) {
      await browser.tabs.create({ url, active: true });
    } else {
      await browser.tabs.update({ url });
    }

    return true;
  }
);

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

const _openActivate = liftBackground(
  "BACKGROUND_OPEN_ACTIVATE_BLUEPRINT",
  async ({ blueprintId, newTab = true }: ActivateBlueprintOptions) => {
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
);

export const openActivateBlueprint = lift(
  "OPEN_ACTIVATE_BLUEPRINT",
  async (options: ActivateBlueprintOptions) => _openActivate(options)
);

export const openExtensionOptions = lift("OPEN_OPTIONS", async () =>
  _openOptions()
);

export const openMarketplace = lift(
  "OPEN_MARKETPLACE",
  async (options: OpenOptionsOptions = {}) => _openMarketplace(options)
);
