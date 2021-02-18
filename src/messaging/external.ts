/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * API for PixieBrix app to talk to the browser extension.
 */
import { AuthData, updateExtensionAuth } from "@/auth/token";
import { liftBackground } from "@/background/protocol";
import { detect } from "detect-browser";
import { liftExternal } from "@/contentScript/externalProtocol";

import { browser } from "webextension-polyfill-ts";
import { SerializableResponse } from "@/messaging/protocol";

const detectedBrowser = detect();

function lift<R extends SerializableResponse = SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => Promise<R>
): (...args: unknown[]) => Promise<R> {
  const backgroundMethod: (...args: unknown[]) => Promise<R> = liftBackground(
    type,
    method
  );
  const contentScriptMethod: (...args: unknown[]) => Promise<R> = liftExternal(
    type,
    method
  );

  return async (...args: unknown[]) => {
    switch (detectedBrowser.name) {
      case "chrome": {
        return await backgroundMethod(...args);
      }
      default: {
        return await contentScriptMethod(...args);
      }
    }
  };
}

export const connectPage = lift("CONNECT_PAGE", async () => {
  return browser.runtime.getManifest();
});

const _reload = liftBackground("BACKGROUND_RELOAD", async () => {
  browser.runtime.reload();
});

// called by PixieBrix app
export const setExtensionAuth = lift(
  "SET_EXTENSION_AUTH",
  async (auth: AuthData) => {
    const updated = await updateExtensionAuth(auth);
    if (updated) {
      // A hack to ensure the SET_EXTENSION_AUTH response flows to the front-end before the backend
      // page is reloaded, causing the message port to close.
      setTimeout(async () => {
        await _reload();
      }, 100);
    }
    return updated;
  }
);

// chrome.runtime.openOptionsPage only available from the background page
const _openOptions = liftBackground("BACKGROUND_OPEN_OPTIONS", async () => {
  await browser.runtime.openOptionsPage();
  return true;
});

const _openMarketplace = liftBackground(
  "BACKGROUND_OPEN_MARKETPLACE",
  async () => {
    const url = browser.runtime.getURL("options.html");
    await browser.tabs.create({
      url: `${url}#/marketplace`,
    });
    return true;
  }
);

export const openExtensionOptions = lift("OPEN_OPTIONS", async () => {
  return await _openOptions();
});

export const openMarketplace = lift("OPEN_MARKETPLACE", async () => {
  return await _openMarketplace();
});
