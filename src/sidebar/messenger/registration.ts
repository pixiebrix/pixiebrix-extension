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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import {
  activatePanel,
  hideForm,
  renderPanels,
  showForm,
} from "@/sidebar/protocol";
import { isBrowserSidebar } from "@/chrome";

async function noop() {}

// TODO: Use `expectContext("sidebar")` when it’s supported
if (!isBrowserSidebar()) {
  throw new Error('This code can only run in the "sidebar" context');
}

declare global {
  interface MessengerMethods {
    SIDEBAR_ACTIVATE_PANEL: typeof activatePanel;
    SIDEBAR_RENDER_PANELS: typeof renderPanels;
    SIDEBAR_SHOW_FORM: typeof showForm;
    SIDEBAR_HIDE_FORM: typeof hideForm;
    SIDEBAR_PING: typeof noop;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SIDEBAR_ACTIVATE_PANEL: activatePanel,
    SIDEBAR_RENDER_PANELS: renderPanels,
    SIDEBAR_SHOW_FORM: showForm,
    SIDEBAR_HIDE_FORM: hideForm,
    SIDEBAR_PING: noop,
  });
}
