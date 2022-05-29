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
 * WARNING: The file isn't loaded yet, it's just a blueprint.
 * TODO: https://github.com/pixiebrix/webext-messenger/issues/6
 */

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import {
  openActivateBlueprint,
  openExtensionOptions,
  openMarketplace,
  setExtensionAuth,
} from "./_implementation";

expectContext("background");

declare global {
  interface MessengerMethods {
    CONNECT_PAGE: typeof browser.runtime.getManifest;
    SET_EXTENSION_AUTH: typeof setExtensionAuth;
    OPEN_MARKETPLACE: typeof openMarketplace;
    OPEN_ACTIVATE_BLUEPRINT: typeof openActivateBlueprint;
    OPEN_OPTIONS: typeof openExtensionOptions;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    CONNECT_PAGE: browser.runtime.getManifest,
    SET_EXTENSION_AUTH: setExtensionAuth,
    OPEN_MARKETPLACE: openMarketplace,
    OPEN_ACTIVATE_BLUEPRINT: openActivateBlueprint,
    OPEN_OPTIONS: openExtensionOptions,
  });
}
