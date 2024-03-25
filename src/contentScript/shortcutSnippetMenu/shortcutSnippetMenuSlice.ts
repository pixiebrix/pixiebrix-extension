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

import type { ShortcutSnippet } from "@/platform/platformTypes/shortcutSnippetMenuProtocol";

export type MenuState = {
  /**
   * The active query string corresponding to the search results, or null if there's no active query (e.g., because the
   * user pressed the escape key).
   */
  query: Nullishable<string>;
  /**
   * The sorted list of search results
   */
  results: ShortcutSnippet[];
  /**
   * The index of the selected result, or nullish if no result is selected/available.
   */
  selectedIndex: Nullishable<number>;

  /**
   * The latest active shortcut snippet, or null if no shortcut snippet has been run.
   */
  activeShortcutSnippet: Nullishable<{
    shortcutSnippet: ShortcutSnippet;
    state: AsyncState;
  }>;
};

export const initialState: MenuState = {
  query: null,
  results: [],
  selectedIndex: null,
  activeShortcutSnippet: null,
};

export function selectSelectedShortcutSnippet(
  state: MenuState,
): Nullishable<ShortcutSnippet> {
  return state.selectedIndex == null
    ? null
    : state.results[state.selectedIndex];
}

export const shortcutSnippetMenuSlice = createSlice({
  name: "snippetShortcutMenuSlice",
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
        shortcutSnippets: ShortcutSnippet[];
        query: Nullishable<string>;
      }>,
    ) {
      const { shortcutSnippets, query } = action.payload;
      state.query = query;

      // For performance, could consider adding a setShortcutSnippets action to avoid sorting on every search
      const sortedSnippets = sortBy(shortcutSnippets, "shortcut");
      if (query == null) {
        state.results = sortedSnippets;
        state.selectedIndex = null;
      } else {
        // Allow case-insensitive search
        const normalizedQuery = query.toLowerCase();
        state.results = sortedSnippets.filter((snippet) =>
          snippet.shortcut.toLowerCase().startsWith(normalizedQuery),
        );
        state.selectedIndex = state.results.length > 0 ? 0 : null;
      }
    },

    // Async thunks don't work with React useReducer so write async logic as a hook
    // https://github.com/reduxjs/redux-toolkit/issues/754
    setShortcutSnippetLoading(
      state,
      action: PayloadAction<{
        shortcutSnippet: ShortcutSnippet;
      }>,
    ) {
      const { shortcutSnippet } = action.payload;
      state.activeShortcutSnippet = {
        shortcutSnippet,
        state: loadingAsyncStateFactory(),
      };
    },
    // In practice, the menu will be hidden on success. This state is for Storybook where the component is persistent
    setShortcutSnippetSuccess(
      state,
      action: PayloadAction<{
        text: string;
      }>,
    ) {
      const { text } = action.payload;
      if (state.activeShortcutSnippet) {
        state.activeShortcutSnippet.state = valueToAsyncState(text);
      }
    },
    setShortcutSnippetError(
      state,
      action: PayloadAction<{
        error: unknown;
      }>,
    ) {
      // Assumes only one shortcut snippet at a time
      const { error } = action.payload;
      if (state.activeShortcutSnippet) {
        state.activeShortcutSnippet.state = errorToAsyncState(error);
      }
    },
  },
});
