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

import { createSlice } from "@reduxjs/toolkit";
import { orderBy } from "lodash";
import { localStorage } from "redux-persist-webextension-storage";

type RecentBrick = {
  id: string;
  timestamp: number;
};

export type WorkshopState = {
  recent: RecentBrick[];
  maxRecent: number;

  filters: {
    scopes: string[];
    collections: string[];
    kinds: string[];
  };
};

const initialWorkshopState: WorkshopState = {
  recent: [],
  // Only track the 10 most recent bricks accessed, since that's how many are shown on the workspace page
  maxRecent: 10,

  filters: {
    scopes: [],
    collections: [],
    kinds: [],
  },
};

const workshopSlice = createSlice({
  name: "workshop",
  initialState: initialWorkshopState,
  reducers: {
    setScopes(state, { payload: scopes }) {
      state.filters.scopes = scopes;
    },
    setCollections(state, { payload: collections }) {
      state.filters.collections = collections;
    },
    setKinds(state, { payload: kinds }) {
      state.filters.kinds = kinds;
    },
    clearFilters(state) {
      state.filters = {
        scopes: [],
        collections: [],
        kinds: [],
      };
    },
    touchBrick(state, { payload: { id } }) {
      if (id) {
        state.recent = state.recent.filter((x) => x.id !== id);
        state.recent.push({
          id,
          timestamp: Date.now(),
        });
        state.recent = orderBy(
          state.recent,
          [(x) => x.timestamp],
          ["desc"]
        ).slice(0, state.maxRecent);
      }
    },
  },
});

export const persistWorkshopConfig = {
  key: "workshop",
  storage: localStorage,
};

export default workshopSlice;
