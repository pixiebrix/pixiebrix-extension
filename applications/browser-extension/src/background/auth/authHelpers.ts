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

import { InteractiveLoginRequiredError } from "../../errors/authErrors";
import type { Identity } from "webextension-polyfill";
import { getErrorMessage } from "../../errors/errorHelpers";

// https://chromium.googlesource.com/chromium/src/+/ee37f1b7c6da834dec9056283cf83d88b0f2f53c/chrome/browser/extensions/api/identity/identity_api.cc
const INTERACTIVE_MESSAGE_PATTERNS = [
  "User interaction required",
  "cancelled",
  "The user did not approve access",
];

/**
 * Launches the web authentication flow for the given URL.
 *
 * Wrapper around to wrap in specific errors:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity/launchWebAuthFlow
 *
 * @throws InteractiveLoginRequiredError if the user cancels the authentication, did not approve access, or an
 *  interactive login is required but interactive is set to false
 */
export async function launchWebAuthFlow(
  details: Identity.LaunchWebAuthFlowDetailsType,
): Promise<string> {
  let responseUrl: string | null = null;

  try {
    responseUrl = await browser.identity.launchWebAuthFlow(details);
  } catch (error) {
    const message = getErrorMessage(error);
    if (
      INTERACTIVE_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))
    ) {
      throw new InteractiveLoginRequiredError(message, { cause: error });
    }

    if (message === "Authorization page could not be loaded.") {
      throw new InteractiveLoginRequiredError(
        "Unable to load the login page. Try again, or contact your team admin if the problem persists",
      );
    }
  }

  if (!responseUrl) {
    throw new InteractiveLoginRequiredError("Authentication cancelled");
  }

  return responseUrl;
}
