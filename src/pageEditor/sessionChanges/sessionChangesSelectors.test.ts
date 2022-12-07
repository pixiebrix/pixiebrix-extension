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

import { SessionRootState } from "@/pageEditor/slices/sessionSlice";
import { SessionChangesRootState } from "@/pageEditor/sessionChanges/sessionChangesSlice";
import { uuidv4 } from "@/types/helpers";
import { selectIsStaleSession } from "@/pageEditor/sessionChanges/sessionChangesSelectors";

describe("selectIsStaleSession", () => {
  test("empty changes state", () => {
    const state: SessionRootState & SessionChangesRootState = {
      session: {
        sessionId: uuidv4(),
        sessionStart: Date.now(),
      },
      sessionChanges: {
        latestChanges: {},
      },
    };
    expect(selectIsStaleSession(state)).toBeFalse();
  });

  test("older changes in another tab", () => {
    const state: SessionRootState & SessionChangesRootState = {
      session: {
        sessionId: uuidv4(),
        sessionStart: Date.now(),
      },
      sessionChanges: {
        latestChanges: {
          [uuidv4()]: Date.now() - 100_000,
        },
      },
    };
    expect(selectIsStaleSession(state)).toBeFalse();
  });

  test("newer changes in another tab", () => {
    const sessionId = uuidv4();
    const sessionStart = Date.now() - 100_000;
    const state: SessionRootState & SessionChangesRootState = {
      session: { sessionId, sessionStart },
      sessionChanges: {
        latestChanges: {
          [sessionId]: sessionStart + 10_000,
          [uuidv4()]: Date.now(),
        },
      },
    };
    expect(selectIsStaleSession(state)).toBeTrue();
  });
});
