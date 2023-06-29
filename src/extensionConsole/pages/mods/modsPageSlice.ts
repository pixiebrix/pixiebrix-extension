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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Filters, type SortingRule } from "react-table";
import { localStorage } from "redux-persist-webextension-storage";
import { type StorageInterface } from "@/store/StorageInterface";
import { revertAll } from "@/store/commonActions";
import { type ModViewItem } from "@/types/modTypes";

type View = "list" | "grid";

export type ActiveTab = {
  key: string;
  tabTitle: string;
  filters: Filters<ModViewItem>;
  hideToolbar?: boolean;
};

export type ModsState = {
  view: View;
  groupBy: string[];
  sortBy: Array<SortingRule<ModViewItem>>;
  activeTab: ActiveTab;
  searchQuery: string;
};

const initialState: ModsState = {
  view: "list",
  groupBy: [],
  sortBy: [],
  activeTab: {
    key: null,
    tabTitle: null,
    filters: [],
  },
  searchQuery: "",
};

const modsPageSlice = createSlice({
  name: "mods",
  initialState,
  reducers: {
    setView(state, { payload: view }: PayloadAction<View>) {
      state.view = view;
    },
    setGroupBy(state, { payload: groupBy }: PayloadAction<string[]>) {
      state.groupBy = groupBy;
    },
    setSortBy(
      state,
      { payload: sortBy }: PayloadAction<Array<SortingRule<ModViewItem>>>
    ) {
      state.sortBy = sortBy;
    },
    setActiveTab(state, { payload: tab }: PayloadAction<ActiveTab>) {
      state.activeTab = tab;
    },
    setSearchQuery(state, { payload: searchQuery }: PayloadAction<string>) {
      state.searchQuery = searchQuery;
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
});

export const persistModsConfig = {
  key: "blueprintsOptions",
  storage: localStorage as StorageInterface,
};

export default modsPageSlice;
