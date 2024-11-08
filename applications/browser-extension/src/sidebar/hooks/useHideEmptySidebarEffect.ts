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

import useAsyncEffect from "use-async-effect";
import { getReservedSidebarEntries } from "../../contentScript/messenger/api";
import { getConnectedTarget } from "../connectedTarget";
import { useSelector } from "react-redux";
import {
  selectClosedTabs,
  selectVisiblePanelCount,
} from "../sidebarSelectors";
import { eventKeyForEntry } from "../../store/sidebar/eventKeyUtils";

/**
 * Hide the sidebar if there are no visible panels. We use this to close the sidebar if the user closes all panels.
 */
function useHideEmptySidebarEffect(): void {
  const visiblePanelCount = useSelector(selectVisiblePanelCount);
  const closedTabs = useSelector(selectClosedTabs);

  useAsyncEffect(
    async (isMounted) => {
      const topFrame = await getConnectedTarget();
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
        isMounted() &&
        visiblePanelCount === 0 &&
        openReservedPanels.length === 0
      ) {
        window.close();
      }
    },
    [visiblePanelCount],
  );
}

export default useHideEmptySidebarEffect;
