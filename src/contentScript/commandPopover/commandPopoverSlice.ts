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

import type { Nullishable } from "@/utils/nullishUtils";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { sortBy } from "lodash";
import type { AsyncState } from "@/types/sliceTypes";
import {
  errorToAsyncState,
  loadingAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import type { TextCommand } from "@/platform/platformProtocol";

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
   * The latest active command, or null if no command has been run.
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

export function selectSelectedCommand(
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
        const next = (state.selectedIndex ?? 0) + offset;
        if (next >= 0) {
          state.selectedIndex = next % state.results.length;
        } else {
          state.selectedIndex =
            state.results.length + (next % state.results.length);
        }
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

    // Async thunks don't work with React useReducer so write async logic as a hook
    // https://github.com/reduxjs/redux-toolkit/issues/754
    setCommandLoading(
      state,
      action: PayloadAction<{
        command: TextCommand;
      }>,
    ) {
      const { command } = action.payload;
      state.activeCommand = { command, state: loadingAsyncStateFactory() };
    },
    // In practice, the popover will be hidden on success. This state is for Storybook where the component is persistent
    setCommandSuccess(
      state,
      action: PayloadAction<{
        text: string;
      }>,
    ) {
      const { text } = action.payload;
      if (state.activeCommand) {
        state.activeCommand.state = valueToAsyncState(text);
      }
    },
    setCommandError(
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
