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
 * @file API for the PixieBrix app to talk to the browser extension.
 * TODO: It's not yet using the Messenger: https://github.com/pixiebrix/webext-messenger/issues/6
 */

import { _liftBackground } from "@/background/externalProtocol";
import * as local from "@/background/messenger/external/_implementation";
// eslint-disable-next-line import/no-restricted-paths -- Legacy code, needs https://github.com/pixiebrix/webext-messenger/issues/6
import { liftExternalToContentScript } from "@/contentScript/externalProtocol";
import { isChrome } from "webext-detect-page";
import { SerializableResponse } from "@/messaging/protocol";

const liftExternal = isChrome()
  ? // Chrome can communicate directly via the standard chrome.runtime.sendMessage API.
    _liftBackground
  : // Firefox doesn't support web-to-background communication, so it must be travel via the content script.
    <TArguments extends unknown[], R extends SerializableResponse>(
      type: string,
      method: (...args: TArguments) => Promise<R>
    ) => {
      const liftedToBackground = _liftBackground(`BACKGROUND_${type}`, method);
      return liftExternalToContentScript(type, liftedToBackground);
    };

export const connectPage = liftExternal("CONNECT_PAGE", async () =>
  browser.runtime.getManifest()
);

export const setExtensionAuth = liftExternal(
  "SET_EXTENSION_AUTH",
  local.setExtensionAuth
);

export const openMarketplace = liftExternal(
  "OPEN_MARKETPLACE",
  local.openMarketplace
);

export const openActivateBlueprint = liftExternal(
  "OPEN_ACTIVATE_BLUEPRINT",
  local.openActivateBlueprint
);

export const openExtensionOptions = liftExternal(
  "OPEN_OPTIONS",
  local.openExtensionOptions
);
