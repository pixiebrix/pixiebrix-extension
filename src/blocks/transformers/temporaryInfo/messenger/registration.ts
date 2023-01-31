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
  setTemporaryPanelNonce,
  updateTemporaryPanel,
} from "@/blocks/transformers/temporaryInfo/receiverProtocol";
import { expectContext } from "@/utils/expectContext";

expectContext("extension");

declare global {
  interface MessengerMethods {
    EPHEMERAL_PANEL_UPDATE_TEMPORARY_PANEL: typeof updateTemporaryPanel;
    EPHEMERAL_PANEL_SET_TEMPORARY_PANEL: typeof setTemporaryPanelNonce;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    EPHEMERAL_PANEL_UPDATE_TEMPORARY_PANEL: updateTemporaryPanel,
    EPHEMERAL_PANEL_SET_TEMPORARY_PANEL: setTemporaryPanelNonce,
  });
}
