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

// These types should only exist in the extension side, never in the App
import type { Browser, Runtime, Identity } from "webextension-polyfill";

// TODO: This overrides Firefox’ types. It's possible that the return types are different between Firefox and Chrome
interface ExtendedRuntime extends Omit<Runtime.Static, "requestUpdateCheck"> {
  /*
   * Requests an update check for this app/extension.
   */
  requestUpdateCheck(): Promise<chrome.runtime.RequestUpdateCheckStatus>;
}

/**
 * Gets an OAuth2 access token using the client ID and scopes specified in the oauth2 section of manifest.json.
 */
interface ExtendedIdentity extends Identity.Static {
  /**
   * Gets an OAuth2 access token using the client ID and scopes specified in the oauth2 section of manifest.json.
   */
  getAuthToken(details?: chrome.identity.TokenDetails): Promise<string>;

  /**
   * Removes an OAuth2 access token from the Identity API's token cache.
   */
  removeCachedAuthToken(
    details: chrome.identity.TokenInformation
  ): Promise<void>;
}

// @ts-expect-error See Firefox/requestUpdateCheck-related comment above
interface ChromeifiedBrowser extends Browser {
  runtime: ExtendedRuntime;
  identity: ExtendedIdentity;
}

declare global {
  const browser: ChromeifiedBrowser;
}
