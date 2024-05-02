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
 * @file
 * Do not use `getMethod` in this file; Keep only registrations here, not implementations
 *
 * `strictNullCheck errors` context: https://github.com/pixiebrix/pixiebrix-extension/issues/6526
 */

import { registerMethods } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import {
  requestRunInAllFrames,
  requestRunInOtherTabs,
  requestRunInOpener,
  requestRunInTarget,
  requestRunInTop,
} from "@/background/executor"; // Depends on contentScript/messenger to pass strictNullCheck
import { removeExtensionForEveryTab } from "@/background/removeExtensionForEveryTab"; // Depends on contentScript/messenger to pass strictNullCheck
import { debouncedActivateStarterMods as installStarterBlueprints } from "@/background/starterMods"; // Depends on contentScript/messenger to pass strictNullCheck
import { setCopilotProcessData } from "@/background/partnerHandlers"; // Depends on contentScript/messenger to pass strictNullCheck
import { preloadContextMenus } from "@/background/contextMenus/preloadContextMenus"; // 197 strictNullCheck errors

expectContext("background");

declare global {
  interface MessengerMethods {
    PRELOAD_CONTEXT_MENUS: typeof preloadContextMenus;

    SET_PARTNER_COPILOT_DATA: typeof setCopilotProcessData;

    INSTALL_STARTER_BLUEPRINTS: typeof installStarterBlueprints;

    REMOVE_EXTENSION_EVERY_TAB: typeof removeExtensionForEveryTab;

    REQUEST_RUN_IN_OPENER: typeof requestRunInOpener;
    REQUEST_RUN_IN_TARGET: typeof requestRunInTarget;
    REQUEST_RUN_IN_TOP: typeof requestRunInTop;
    REQUEST_RUN_IN_OTHER_TABS: typeof requestRunInOtherTabs;
    REQUEST_RUN_IN_ALL_FRAMES: typeof requestRunInAllFrames;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SET_PARTNER_COPILOT_DATA: setCopilotProcessData,

    INSTALL_STARTER_BLUEPRINTS: installStarterBlueprints,

    PRELOAD_CONTEXT_MENUS: preloadContextMenus,

    REMOVE_EXTENSION_EVERY_TAB: removeExtensionForEveryTab,

    REQUEST_RUN_IN_OPENER: requestRunInOpener,
    REQUEST_RUN_IN_TARGET: requestRunInTarget,
    REQUEST_RUN_IN_TOP: requestRunInTop,
    REQUEST_RUN_IN_OTHER_TABS: requestRunInOtherTabs,
    REQUEST_RUN_IN_ALL_FRAMES: requestRunInAllFrames,
  });
}
