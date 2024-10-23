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

import { useSelector } from "react-redux";
import useBrickTraceRecord from "@/pageEditor/tabs/editTab/dataPanel/tabs/useBrickTraceRecord";
import { assertNotNullish } from "@/utils/nullishUtils";
import { useMemo } from "react";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { isEqual, omit } from "lodash";
import {
  selectActiveModComponentFormState,
  selectActiveNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";

/**
 * Return true if the rendered Sidebar Panel might be out of sync with the configuration.
 */
function useIsSidebarPanelStale(): boolean {
  const { blockConfig: brickConfig } = useSelector(selectActiveNodeInfo);

  const { traceRecord } = useBrickTraceRecord();

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  assertNotNullish(
    activeModComponentFormState,
    "useIsSidebarPanelStale can only be called in a mod component editor context",
  );

  return useMemo(() => {
    // Only returns true for Side Panel mod components
    if (
      activeModComponentFormState.starterBrick.definition.type !==
      StarterBrickTypes.SIDEBAR_PANEL
    ) {
      return false;
    }

    // No traces or no changes since the last render, we are good, no alert
    if (
      traceRecord == null ||
      isEqual(
        // Comments don't change the behavior of the panel
        omit(traceRecord.brickConfig, ["comments"]),
        omit(brickConfig, ["comments"]),
      )
    ) {
      return false;
    }

    return true;
  }, [activeModComponentFormState, traceRecord, brickConfig]);
}

export default useIsSidebarPanelStale;
