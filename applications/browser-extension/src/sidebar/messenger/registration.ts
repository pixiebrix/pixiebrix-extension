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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import {
  activatePanel,
  hideActivateMods,
  hideForm,
  hideTemporaryPanel,
  renderPanels,
  showActivateMods,
  showForm,
  showTemporaryPanel,
  updateTemporaryPanel,
  navigationComplete,
} from "../protocol";
import { expectContext } from "../../utils/expectContext";
import { noop } from "lodash";

expectContext("sidebar");

declare global {
  interface MessengerMethods {
    SIDEBAR_ACTIVATE_PANEL: typeof activatePanel;
    SIDEBAR_RENDER_PANELS: typeof renderPanels;
    SIDEBAR_SHOW_FORM: typeof showForm;
    SIDEBAR_HIDE_FORM: typeof hideForm;
    SIDEBAR_PING: typeof noop;
    SIDEBAR_CLOSE: typeof window.close;
    SIDEBAR_RELOAD: typeof location.reload;
    SIDEBAR_SHOW_TEMPORARY_PANEL: typeof showTemporaryPanel;
    SIDEBAR_UPDATE_TEMPORARY_PANEL: typeof updateTemporaryPanel;
    SIDEBAR_HIDE_TEMPORARY_PANEL: typeof hideTemporaryPanel;
    SIDEBAR_SHOW_ACTIVATE_RECIPE: typeof showActivateMods;
    SIDEBAR_HIDE_ACTIVATE_RECIPE: typeof hideActivateMods;
    SIDEBAR_NAVIGATION_COMPLETE: typeof navigationComplete;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SIDEBAR_ACTIVATE_PANEL: activatePanel,
    SIDEBAR_RENDER_PANELS: renderPanels,
    SIDEBAR_SHOW_FORM: showForm,
    SIDEBAR_HIDE_FORM: hideForm,
    SIDEBAR_CLOSE: window.close.bind(window),
    SIDEBAR_PING: noop,
    SIDEBAR_RELOAD: location.reload.bind(location),
    SIDEBAR_SHOW_TEMPORARY_PANEL: showTemporaryPanel,
    SIDEBAR_UPDATE_TEMPORARY_PANEL: updateTemporaryPanel,
    SIDEBAR_HIDE_TEMPORARY_PANEL: hideTemporaryPanel,
    SIDEBAR_SHOW_ACTIVATE_RECIPE: showActivateMods,
    SIDEBAR_HIDE_ACTIVATE_RECIPE: hideActivateMods,
    SIDEBAR_NAVIGATION_COMPLETE: navigationComplete,
  });
}
