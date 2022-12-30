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

import { type SidebarEntries, type EntryType } from "@/sidebar/types";
import { type UUID } from "@/core";

export function mapTabEventKey(
  type: "panel",
  entry: { extensionId: UUID } | null
): string | null;
export function mapTabEventKey(
  type: "form" | "temporaryPanel",
  entry: { nonce?: UUID; extensionId?: UUID } | null
): string | null;
export function mapTabEventKey(
  entryType: EntryType,
  // Permanent panels don't have a nonce
  entry: { nonce?: UUID; extensionId: UUID } | null
): string | null {
  if (entry == null) {
    return null;
  }

  // Prefer nonce so there's unique eventKey for forms and temporary panels from an extension
  return `${entryType}-${entry.nonce ?? entry.extensionId}`;
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
}: SidebarEntries): string | null {
  if (forms.length > 0) {
    return mapTabEventKey("form", forms.at(-1));
  }

  if (temporaryPanels.length > 0) {
    return mapTabEventKey("temporaryPanel", temporaryPanels.at(-1));
  }

  return mapTabEventKey("panel", panels[0]);
}
