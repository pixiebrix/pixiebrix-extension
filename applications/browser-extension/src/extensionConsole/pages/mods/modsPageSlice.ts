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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Filters, type SortingRule } from "react-table";
import { localStorage } from "redux-persist-webextension-storage";
import { type StorageInterface } from "@/store/StorageInterface";
import { revertAll } from "@/store/commonActions";
import { type ModViewItem } from "@/types/modTypes";

type View = "list" | "grid";

export type ActiveTab = {
  key?: string;
  tabTitle: string | null;
  filters: Filters<ModViewItem>;
  hideToolbar?: boolean;
};

export type ModsPageState = {
  view: View;
  groupBy: string[];
  sortBy: Array<SortingRule<ModViewItem>>;
  activeTab: ActiveTab;
  searchQuery: string;
  isLoadingData: boolean;
};

const initialState: ModsPageState = {
  view: "list",
  groupBy: [],
  sortBy: [],
  activeTab: {
    tabTitle: null,
    filters: [],
  },
  searchQuery: "",
  isLoadingData: true,
};

const modsPageSlice = createSlice({
  name: "modsPage",
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
      { payload: sortBy }: PayloadAction<Array<SortingRule<ModViewItem>>>,
    ) {
      state.sortBy = sortBy;
    },
    setActiveTab(state, { payload: tab }: PayloadAction<ActiveTab>) {
      state.activeTab = tab;
    },
    setSearchQuery(state, { payload: searchQuery }: PayloadAction<string>) {
      state.searchQuery = searchQuery;
    },
    setIsLoadingData(
      state,
      { payload: isLoadingData }: PayloadAction<boolean>,
    ) {
      state.isLoadingData = isLoadingData;
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
