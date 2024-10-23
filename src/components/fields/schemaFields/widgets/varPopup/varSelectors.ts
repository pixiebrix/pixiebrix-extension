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

import { selectKnownVars } from "@/analysis/analysisSelectors";
import { createSelector } from "@reduxjs/toolkit";
import {
  selectActiveModComponentId,
  selectActiveNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";

export const selectKnownVarsForActiveNode = createSelector(
  selectActiveModComponentId,
  selectActiveNodeInfo,
  selectKnownVars,
  (activeModComponentId, activeNodeInfo, knownVars) => {
    if (activeNodeInfo == null || activeModComponentId == null) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- is a UUID
    return knownVars[activeModComponentId]?.get(activeNodeInfo.path);
  },
);
