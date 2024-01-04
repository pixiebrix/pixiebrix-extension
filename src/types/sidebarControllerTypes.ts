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

export const SIDEPANEL_PORT_NAME = "sidepanel";

export type SidebarStatusMessage = {
  type: "status";
  payload: {
    /**
     * The tabId of the sidebar is shown on.
     */
    tabId: number;
    /**
     * True if the sidebar is currently hidden, e.g., because the user has selected a different sidebar.
     */
    hidden: boolean;
  };
};

/**
 * Returns true if the given message is a SidebarStatusMessage.
 * @param message the value to check
 */
export function isSidebarStatusMessage(
  message: unknown,
): message is SidebarStatusMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "status"
  );
}
