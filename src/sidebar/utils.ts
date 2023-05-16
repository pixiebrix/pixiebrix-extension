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

import { type SidebarEntries, type SidebarEntry } from "@/sidebar/types";

export function eventKeyForEntry(entry: SidebarEntry | null): string | null {
  if (entry == null) {
    // TODO: fixme
    return "home-panel";
  }

  if (entry.type === "activateRecipe") {
    return `activate-${entry.recipeId}`;
  }

  if (entry.type === "panel") {
    return `panel-${entry.extensionId}`;
  }

  // Use nonce to keep eventKeys unique for forms and temporary panels from the same extension
  return `${entry.type}-${entry.nonce}`;
}

/**
 * Return the default tab to show.
 *
 * Give preference to:
 * - Most recent ephemeral form
 * - Most recent temporary panel
 * - First panel
 */
export function defaultEventKey({
  forms = [],
  panels = [],
  temporaryPanels = [],
  recipeToActivate = null,
}: SidebarEntries): string | null {
  if (forms.length > 0) {
    return eventKeyForEntry(forms.at(-1));
  }

  if (temporaryPanels.length > 0) {
    return eventKeyForEntry(temporaryPanels.at(-1));
  }

  if (panels.length > 0) {
    return eventKeyForEntry(panels.at(0));
  }

  return recipeToActivate && eventKeyForEntry(recipeToActivate);
}
