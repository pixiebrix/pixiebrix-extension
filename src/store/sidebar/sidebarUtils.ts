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

import {
  type SidebarEntries,
  type SidebarEntry,
  type SidebarState,
} from "@/types/sidebarTypes";
import {
  eventKeyForEntry,
  getOpenPanelEntries,
} from "@/store/sidebar/eventKeyUtils";
import { type ModComponentRef } from "@/types/modComponentTypes";
import { isEqual } from "lodash";
import type { Nullishable } from "@/utils/nullishUtils";
import { MOD_LAUNCHER } from "@/store/sidebar/constants";

/**
 * Returns the initial panel entry given a modComponentRef, or undefined if not found.
 */
export function findInitialPanelEntry(
  entries: SidebarEntries,
  modComponentRef: Nullishable<ModComponentRef>,
): SidebarEntry | undefined {
  if (modComponentRef == null) {
    return;
  }

  // Prefer an exact match, but fallback to a match from the same mod
  return (
    entries.panels.find((panel) =>
      isEqual(panel.modComponentRef, modComponentRef),
    ) ??
    entries.panels.find(
      (panel) => panel.modComponentRef.modId === modComponentRef.modId,
    )
  );
}

export function getVisiblePanelCount({
  panels,
  forms,
  temporaryPanels,
  staticPanels,
  modActivationPanel,
  closedTabs,
}: SidebarState): number {
  // Temporary Panels are removed from the sidebar state when they are closed, so we don't need to filter them out
  const closablePanels = [...panels, ...staticPanels];
  const openPanels = getOpenPanelEntries(closablePanels, closedTabs);

  return (
    openPanels.length +
    forms.length +
    temporaryPanels.length +
    (modActivationPanel ? 1 : 0)
  );
}

export function eventKeyExists(
  state: SidebarState,
  query: Nullishable<string>,
): boolean {
  if (query == null) {
    return false;
  }

  return (
    state.forms.some((x) => eventKeyForEntry(x) === query) ||
    state.temporaryPanels.some((x) => eventKeyForEntry(x) === query) ||
    state.panels.some((x) => eventKeyForEntry(x) === query) ||
    state.staticPanels.some((x) => eventKeyForEntry(x) === query) ||
    eventKeyForEntry(state.modActivationPanel) === query
  );
}
