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

import { liftContentScript } from "@/contentScript/backgroundProtocol";
import * as native from "@/actionPanel/native";

export const toggleActionPanel = liftContentScript(
  "TOGGLE_ACTION_PANEL",
  async () => native.toggleActionPanel()
);

export const showActionPanel = liftContentScript(
  "SHOW_ACTION_PANEL",
  async () => native.showActionPanel()
);

export const hideActionPanel = liftContentScript(
  "HIDE_ACTION_PANEL",
  async () => native.hideActionPanel()
);

export const removeActionPanelPanel = liftContentScript(
  "REMOVE_ACTION_PANEL_PANEL",
  async (extensionId: string) => native.removeExtension(extensionId)
);
