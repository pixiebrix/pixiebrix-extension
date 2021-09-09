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

/* Do not register handlers in this file */
import { forbidContext } from "@/utils/expectContext";
import { getMethod } from "webext-messenger";

forbidContext("background");

export const containsPermissions = getMethod("CONTAINS_PERMISSIONS");
export const openPopupPrompt = getMethod("OPEN_POPUP_PROMPT");
export const whoAmI = getMethod("ECHO_SENDER");

/**
 * Uninstall context menu and return whether or not the context menu was uninstalled.
 */
export const uninstallContextMenu = getMethod("UNINSTALL_CONTEXT_MENU");
export const ensureContextMenu = getMethod("ENSURE_CONTEXT_MENU");
