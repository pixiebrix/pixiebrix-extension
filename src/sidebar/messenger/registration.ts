/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
} from "@/sidebar/protocol";
import { expectContext } from "@/utils/expectContext";
import { noop } from "lodash";
import { type SerializedError } from "@/types/messengerTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { type JsonObject } from "type-fest";
import { type Event } from "@/telemetry/events";

expectContext("sidebar");

declare global {
  interface MessengerMethods {
    SIDEBAR_ACTIVATE_PANEL: typeof activatePanel;
    SIDEBAR_RENDER_PANELS: typeof renderPanels;
    SIDEBAR_SHOW_FORM: typeof showForm;
    SIDEBAR_HIDE_FORM: typeof hideForm;
    SIDEBAR_PING: typeof noop;
    SIDEBAR_SHOW_TEMPORARY_PANEL: typeof showTemporaryPanel;
    SIDEBAR_UPDATE_TEMPORARY_PANEL: typeof updateTemporaryPanel;
    SIDEBAR_HIDE_TEMPORARY_PANEL: typeof hideTemporaryPanel;
    SIDEBAR_SHOW_ACTIVATE_RECIPE: typeof showActivateMods;
    SIDEBAR_HIDE_ACTIVATE_RECIPE: typeof hideActivateMods;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    SIDEBAR_ACTIVATE_PANEL: activatePanel,
    SIDEBAR_RENDER_PANELS: renderPanels,
    SIDEBAR_SHOW_FORM: showForm,
    SIDEBAR_HIDE_FORM: hideForm,
    SIDEBAR_PING: noop,
    SIDEBAR_SHOW_TEMPORARY_PANEL: showTemporaryPanel,
    SIDEBAR_UPDATE_TEMPORARY_PANEL: updateTemporaryPanel,
    SIDEBAR_HIDE_TEMPORARY_PANEL: hideTemporaryPanel,
    SIDEBAR_SHOW_ACTIVATE_RECIPE: showActivateMods,
    SIDEBAR_HIDE_ACTIVATE_RECIPE: hideActivateMods,
  });
}

declare global {
  // TODO: Remove once background/registration.ts and telemetry/logging.ts are in strictNullChecks
  interface MessengerMethods {
    // Temporary duplicate type for a background method used by the sidebar.
    // NOTE: Changes to those functions must be reflected here.
    RECORD_ERROR: (
      serializedError: SerializedError,
      context: MessageContext,
      data?: JsonObject
    ) => Promise<void>;

    RECORD_EVENT: (event: {
      event: Event;
      data: JsonObject | undefined;
    }) => Promise<void>;
  }
}
