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

/* Do not use `registerMethod` in this file */
import { getMethod } from "webext-messenger";
import { isBrowserSidebar } from "@/chrome";

// TODO: This should be a hard error, but due to unknown dependency routes, it can't be enforced yet
if (isBrowserSidebar() && process.env.DEBUG) {
  console.warn(
    "This should not have been imported in the sidebar. Use the API directly instead."
  );
}

export const renderPanels = getMethod("SIDEBAR_RENDER_PANELS");
export const showForm = getMethod("SIDEBAR_SHOW_FORM");
export const hideForm = getMethod("SIDEBAR_HIDE_FORM");
