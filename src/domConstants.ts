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

export const TOP_LEVEL_FRAME_ID = 0;

export const NOTIFICATIONS_Z_INDEX = 2_147_483_647;

export const MAX_Z_INDEX = NOTIFICATIONS_Z_INDEX - 1; // Let notifications always be higher

export const SELECTION_MENU_READY_ATTRIBUTE = "data-pb-selection-menu-ready";

export const SNIPPET_SHORTCUT_MENU_READY_ATTRIBUTE =
  "data-pb-snippet-shortcut-menu-ready";

export const QUICK_BAR_READY_ATTRIBUTE = "data-pb-quick-bar-ready";

export const PANEL_FRAME_ID = "pixiebrix-extension";

export const PIXIEBRIX_DATA_ATTR = "data-pb-uuid";

export const PIXIEBRIX_QUICK_BAR_CONTAINER_CLASS =
  "pixiebrix-quickbar-container";

export const PIXIEBRIX_TOOLTIPS_CONTAINER_CLASS =
  "pixiebrix-tooltips-container";

export const EXTENSION_POINT_DATA_ATTR = "data-pb-extension-point";

/**
 * A selector that matches all elements that are added to the page by the PixieBrix extension.
 *
 * Compatible with `:not(${thisSelector})`
 */
// When adding additional properties, be sure to make sure they're compatible with :not
export const PRIVATE_ATTRIBUTES_SELECTOR = `
  #${PANEL_FRAME_ID},
  .${PIXIEBRIX_TOOLTIPS_CONTAINER_CLASS},
  .${PIXIEBRIX_QUICK_BAR_CONTAINER_CLASS},
  [${PIXIEBRIX_DATA_ATTR}],
  [${EXTENSION_POINT_DATA_ATTR}]
`;
