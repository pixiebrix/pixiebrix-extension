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

/**
 * @file API for the PixieBrix app to talk to the browser extension.
 * TODO: It's not yet using the Messenger: https://github.com/pixiebrix/webext-messenger/issues/6
 */

import { _liftBackground as liftExternal } from "../../externalProtocol";
import * as local from "./_implementation";
import { getPartnerAuthData } from "../../../auth/authStorage";
import { getExtensionVersion } from "../../../utils/extensionUtils";

export const connectPage = liftExternal("CONNECT_PAGE", async () =>
  // Ensure the version we send to the app is a valid semver.
  ({
    ...browser.runtime.getManifest(),
    version: getExtensionVersion(),
  }),
);

export const setExtensionAuth = liftExternal(
  "SET_EXTENSION_AUTH",
  local.setExtensionAuth,
);

export const setActivatingMods = liftExternal(
  // Can't change SET_ACTIVATING_BLUEPRINT constant due to backward compatability.
  "SET_ACTIVATING_BLUEPRINT",
  local.setActivatingMods,
);

export const openMarketplace = liftExternal(
  "OPEN_MARKETPLACE",
  local.openMarketplace,
);

export const openActivateBlueprint = liftExternal(
  "OPEN_ACTIVATE_BLUEPRINT",
  local.openActivateModPage,
);

export const openExtensionOptions = liftExternal(
  "OPEN_OPTIONS",
  local.openExtensionConsole,
);

export const getPartnerToken = liftExternal(
  "GET_PARTNER_TOKEN",
  getPartnerAuthData,
);

export const activateWelcomeMods = liftExternal(
  // Can't change INSTALL_STARTER_BLUEPRINTS constant due to backward compatability.
  "INSTALL_STARTER_BLUEPRINTS",
  local.activateWelcomeMods,
);
