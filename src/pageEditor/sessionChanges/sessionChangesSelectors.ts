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

import { type SessionRootState } from "@/pageEditor/slices/sessionSliceTypes";
import { type SessionChangesRootState } from "@/pageEditor/sessionChanges/sessionChangesTypes";
import { createSelector } from "reselect";

/**
 * Detect when the current editor instance becomes stale due to changes in another browser tab/editor instance
 *
 * @param session the current session state for this browser tab
 * @param sessionChanges the state of the latest changes for each editor session
 *
 * @returns true if there are newer changes in another editor instance in a different browser tab
 */
export const selectIsStaleSession: (
  state: SessionRootState & SessionChangesRootState
) => boolean = createSelector(
  ({ sessionChanges }: SessionChangesRootState) => sessionChanges.latestChanges,
  ({ session }: SessionRootState) => session,
  (
    latestChanges,
    { sessionId: thisSessionId, sessionStart: thisSessionStart }
  ) => {
    for (const [latestChangeSessionId, latestChangeDate] of Object.entries(
      latestChanges
    )) {
      if (
        thisSessionStart < latestChangeDate &&
        thisSessionId !== latestChangeSessionId
      ) {
        return true;
      }
    }

    return false;
  }
);
