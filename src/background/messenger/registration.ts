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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import { browser } from "webextension-polyfill-ts";
import { expectContext } from "@/utils/expectContext";
import {
  ensureContextMenu,
  uninstallContextMenu,
} from "@/background/contextMenus";
import { openPopupPrompt } from "@/background/permissionPrompt";
import {
  activateTab,
  closeTab,
  markTabAsReady,
  whoAmI,
  openTab,
} from "@/background/executor";
import * as registry from "@/registry/localRegistry";

expectContext("background");

// Temporary, webext-messenger depends on this global
(globalThis as any).browser = browser;

declare global {
  interface MessengerMethods {
    CONTAINS_PERMISSIONS: typeof browser.permissions.contains;
    UNINSTALL_CONTEXT_MENU: typeof uninstallContextMenu;
    ENSURE_CONTEXT_MENU: typeof ensureContextMenu;
    OPEN_POPUP_PROMPT: typeof openPopupPrompt;
    ECHO_SENDER: typeof whoAmI;
    ACTIVATE_TAB: typeof activateTab;
    CLOSE_TAB: typeof closeTab;
    MARK_TAB_AS_READY: typeof markTabAsReady;
    OPEN_TAB: typeof openTab;
    REGISTRY_GET_KIND: typeof registry.getKind;
    REGISTRY_GET_LOCAL: typeof registry.getLocal;
    REGISTRY_PUT: typeof registry.add;
    REGISTRY_SYNC: typeof registry.syncRemote;
    REGISTRY_FIND: typeof registry.find;
  }
}

registerMethods({
  CONTAINS_PERMISSIONS: browser.permissions.contains,
  UNINSTALL_CONTEXT_MENU: uninstallContextMenu,
  ENSURE_CONTEXT_MENU: ensureContextMenu,
  OPEN_POPUP_PROMPT: openPopupPrompt,
  ECHO_SENDER: whoAmI,
  ACTIVATE_TAB: activateTab,
  CLOSE_TAB: closeTab,
  MARK_TAB_AS_READY: markTabAsReady,
  OPEN_TAB: openTab,
  REGISTRY_GET_KIND: registry.getKind,
  REGISTRY_GET_LOCAL: registry.getLocal,
  REGISTRY_PUT: registry.add,
  REGISTRY_SYNC: registry.syncRemote,
  REGISTRY_FIND: registry.find,
});
