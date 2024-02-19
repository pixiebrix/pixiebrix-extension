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

import type { TextCommand } from "@/contentScript/commandPopover/CommandRegistry";
import type { Nullishable } from "@/utils/nullishUtils";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { sortBy } from "lodash";
import type { AsyncState } from "@/types/sliceTypes";
import {
  errorToAsyncState,
  loadingAsyncStateFactory,
} from "@/utils/asyncStateUtils";

type PopoverState = {
  /**
   * The active query string corresponding to the search results, or null if there's no active query (e.g., because the
   * user pressed the escape key).
   */
  query: Nullishable<string>;
  /**
   * The sorted list of search results
   */
  results: TextCommand[];
  /**
   * The index of the selected result, or nullish if no result is selected/available.
   */
  selectedIndex: Nullishable<number>;

  /**
   * The command that is currently being run, or nullish if not command is being run.
   */
  activeCommand: Nullishable<{
    command: TextCommand;
    state: AsyncState;
  }>;
};

export const initialState: PopoverState = {
  query: null,
  results: [],
  selectedIndex: null,
  activeCommand: null,
};

export function selectSelectedResult(
  state: PopoverState,
): Nullishable<TextCommand> {
  return state.selectedIndex == null
    ? null
    : state.results[state.selectedIndex];
}

export const popoverSlice = createSlice({
  name: "popoverSlice",
  initialState,
  reducers: {
    offsetSelectedIndex(
      state,
      action: PayloadAction<{
        offset: number;
      }>,
    ) {
      const { offset } = action.payload;

      if (state.selectedIndex == null || state.results.length === 0) {
        state.selectedIndex = null;
      } else {
        state.selectedIndex =
          ((state.selectedIndex ?? 0) + offset) % state.results.length;
      }
    },
    search(
      state,
      action: PayloadAction<{
        commands: TextCommand[];
        query: Nullishable<string>;
      }>,
    ) {
      const { commands, query } = action.payload;
      state.query = query;

      // For performance, could consider adding a setCommands action to avoid sorting on every search
      const sortedCommands = sortBy(commands, "shortcut");
      if (query == null) {
        state.results = sortedCommands;
        state.selectedIndex = null;
      } else {
        state.results = sortedCommands.filter((command) =>
          command.shortcut.startsWith(query),
        );
        state.selectedIndex = state.results.length > 0 ? 0 : null;
      }
    },
    commandRun(
      state,
      action: PayloadAction<{
        command: TextCommand;
      }>,
    ) {
      const { command } = action.payload;
      state.activeCommand = { command, state: loadingAsyncStateFactory() };
    },
    setCommandRejected(
      state,
      action: PayloadAction<{
        error: unknown;
      }>,
    ) {
      // Assumes only one command at a time
      const { error } = action.payload;
      if (state.activeCommand) {
        state.activeCommand.state = errorToAsyncState(error);
      }
    },
  },
});
