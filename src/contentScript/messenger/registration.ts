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
import { handleMenuAction } from "@/contentScript/contextMenus";
import { queueReactivateTab, reactivateTab } from "@/contentScript/lifecycle";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/modalForms";
import {
  hideActionPanel,
  showActionPanel,
  toggleActionPanel,
  removeExtension,
} from "@/actionPanel/native";

expectContext("contentScript");

// Temporary, webext-messenger depends on this global
(globalThis as any).browser = browser;

declare global {
  interface MessengerMethods {
    FORM_GET_DEFINITION: typeof getFormDefinition;
    FORM_RESOLVE: typeof resolveForm;
    FORM_CANCEL: typeof cancelForm;
    QUEUE_REACTIVATE_TAB: typeof queueReactivateTab;
    REACTIVATE_TAB: typeof reactivateTab;
    HANDLE_MENU_ACTION: typeof handleMenuAction;
    TOGGLE_ACTION_PANEL: typeof toggleActionPanel;
    SHOW_ACTION_PANEL: typeof showActionPanel;
    HIDE_ACTION_PANEL: typeof hideActionPanel;
    REMOVE_ACTION_PANEL: typeof removeExtension;
  }
}

registerMethods({
  FORM_GET_DEFINITION: getFormDefinition,
  FORM_RESOLVE: resolveForm,
  FORM_CANCEL: cancelForm,
  QUEUE_REACTIVATE_TAB: queueReactivateTab,
  REACTIVATE_TAB: reactivateTab,
  HANDLE_MENU_ACTION: handleMenuAction,
  TOGGLE_ACTION_PANEL: toggleActionPanel,
  SHOW_ACTION_PANEL: showActionPanel,
  HIDE_ACTION_PANEL: hideActionPanel,
  REMOVE_ACTION_PANEL: removeExtension,
});
