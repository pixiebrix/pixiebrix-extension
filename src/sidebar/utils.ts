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

import { SidebarEntries, EntryType } from "@/sidebar/types";
import { UUID } from "@/core";

export function mapTabEventKey(
  entryType: EntryType,
  entry: { extensionId: UUID } | null
): string | null {
  if (entry == null) {
    return null;
  }

  return `${entryType}-${entry.extensionId}`;
}

/**
 * Return the default tab to show. Give preference to the most recent ephemeral form.
 */
export function defaultEventKey({
  forms = [],
  panels = [],
}: SidebarEntries): string | null {
  return forms.length > 0
    ? mapTabEventKey("form", forms.at(-1))
    : mapTabEventKey("panel", panels[0]);
}
