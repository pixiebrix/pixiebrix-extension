/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { browser, Runtime } from "webextension-polyfill-ts";
import {
  liftBackground,
  registerPort as internalRegisterPort,
} from "@/background/devtools/internal";
import { ensureContentScript } from "@/background/util";
import type { Target } from "@/types";
import { UUID } from "@/core";
import {
  removeActionPanel,
  showActionPanel,
} from "@/contentScript/messenger/api";

export const registerPort = liftBackground(
  "REGISTER_PORT",
  (target: Target, port: Runtime.Port) => async () => {
    internalRegisterPort(target.tabId, port);
  }
);

export const checkTargetPermissions = liftBackground(
  "CHECK_TARGET_PERMISSIONS",
  (target: Target) => async () => {
    try {
      await browser.tabs.executeScript(target.tabId, {
        code: "true",
        frameId: target.frameId,
      });
      return true;
    } catch {
      return false;
    }
  }
);

export const ensureScript = liftBackground(
  "INJECT_SCRIPT",
  (target: Target) => async () => ensureContentScript(target)
);

export const showBrowserActionPanel = liftBackground(
  "SHOW_BROWSER_ACTION_PANEL",
  (target: Target) => async () => showActionPanel(target)
);

export const uninstallActionPanelPanel = liftBackground(
  "UNINSTALL_ACTION_PANEL_PANEL",
  (target) => async ({ extensionId }: { extensionId: UUID }) =>
    removeActionPanel(target, extensionId)
);
