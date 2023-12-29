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

import useAsyncEffect from "use-async-effect";
import { getTopLevelFrame } from "./sidePanel";
import {
  getReservedSidebarEntries,
  hideSidebar,
} from "@/contentScript/messenger/api";
import { useSelector } from "react-redux";
import {
  selectClosedTabs,
  selectVisiblePanelCount,
} from "@/sidebar/sidebarSelectors";
import { eventKeyForEntry } from "@/sidebar/eventKeyUtils";

/**
 * Hide the sidebar if there are no visible panels. We use this to close the sidebar if the user closes all panels.
 */
export const useHideEmptySidebar = () => {
  const visiblePanelCount = useSelector(selectVisiblePanelCount);
  const closedTabs = useSelector(selectClosedTabs);

  useAsyncEffect(
    async (isMounted) => {
      const topFrame = await getTopLevelFrame();
      const reservedPanelEntries = await getReservedSidebarEntries(topFrame);

      // We don't want to hide the Sidebar if there are any open reserved panels.
      // Otherwise, we would hide the Sidebar when a user re-renders a panel, e.g. when using
      // the form builder.
      const openReservedPanels = [
        ...reservedPanelEntries.panels,
        ...reservedPanelEntries.temporaryPanels,
        ...reservedPanelEntries.forms,
      ].filter((panel) => panel && !closedTabs[eventKeyForEntry(panel)]);

      if (
        isMounted &&
        visiblePanelCount === 0 &&
        openReservedPanels.length === 0
      ) {
        const topLevelFrame = await getTopLevelFrame();
        void hideSidebar(topLevelFrame);
      }
    },
    [visiblePanelCount],
  );
};
