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

import { selectKnownVars } from "@/analysis/analysisSelectors";
import {
  selectActiveElementId,
  selectActiveNodeInfo,
} from "@/pageEditor/slices/editorSelectors";
import { createSelector } from "reselect";

export const selectKnownVarsForActiveNode = createSelector(
  selectActiveElementId,
  selectActiveNodeInfo,
  selectKnownVars,
  (activeElementId, activeNodeInfo, knownVars) => {
    if (activeNodeInfo == null) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- is a UUID
    return knownVars[activeElementId]?.get(activeNodeInfo.path);
  }
);
