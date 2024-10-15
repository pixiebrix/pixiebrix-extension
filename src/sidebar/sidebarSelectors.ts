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
  isBaseModComponentPanelEntry,
  type SidebarRootState,
} from "@/types/sidebarTypes";
import { isEmpty, memoize } from "lodash";
import { eventKeyForEntry } from "@/store/sidebar/eventKeyUtils";
import { getVisiblePanelCount } from "@/store/sidebar/sidebarUtils";
import { createSelector } from "@reduxjs/toolkit";
import { type Nullishable } from "@/utils/nullishUtils";
import { selectActivatedModComponentsMap } from "@/store/modComponents/modComponentSelectors";

export const selectIsSidebarEmpty = ({ sidebar }: SidebarRootState) =>
  isEmpty(sidebar.panels) &&
  isEmpty(sidebar.forms) &&
  isEmpty(sidebar.temporaryPanels) &&
  isEmpty(sidebar.staticPanels) &&
  sidebar.modActivationPanel == null;

export const selectSidebarActiveTabKey = ({ sidebar }: SidebarRootState) =>
  sidebar.activeKey;

export const selectSidebarPanels = ({ sidebar }: SidebarRootState) =>
  sidebar.panels;

export const selectSidebarForms = ({ sidebar }: SidebarRootState) =>
  sidebar.forms;

export const selectSidebarTemporaryPanels = ({ sidebar }: SidebarRootState) =>
  sidebar.temporaryPanels;

export const selectSidebarStaticPanels = ({ sidebar }: SidebarRootState) =>
  sidebar.staticPanels;

export const selectSidebarModActivationPanel = ({
  sidebar,
}: SidebarRootState) => sidebar.modActivationPanel;

export const selectSidebarEntries = ({ sidebar }: SidebarRootState) => [
  ...sidebar.panels,
  ...sidebar.forms,
  ...sidebar.temporaryPanels,
  ...sidebar.staticPanels,
  sidebar.modActivationPanel,
];

const selectEventKeyEntryMap = createSelector(
  selectSidebarEntries,
  (entries) =>
    new Map(entries.map((entry) => [eventKeyForEntry(entry), entry])),
);

export const selectModComponentFromEventKey = createSelector(
  selectEventKeyEntryMap,
  selectActivatedModComponentsMap,
  (entryMap, modComponentsMap) =>
    memoize((eventKey: Nullishable<string>) => {
      if (eventKey == null) {
        return;
      }

      // Get sidebar entry by event key
      const sidebarEntry = entryMap.get(eventKey);

      if (!isBaseModComponentPanelEntry(sidebarEntry)) {
        return;
      }

      return modComponentsMap.get(sidebarEntry.modComponentRef.modComponentId);
    }),
);

export const selectClosedTabs = ({ sidebar }: SidebarRootState) =>
  sidebar.closedTabs;

export const selectVisiblePanelCount = ({ sidebar }: SidebarRootState) =>
  getVisiblePanelCount(sidebar);
