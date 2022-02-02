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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { localStorage } from "redux-persist-webextension-storage";

type View = "list" | "grid";

export type BlueprintsState = {
  view: View;
};

const initialState: BlueprintsState = {
  view: "list",
};

const blueprintsSlice = createSlice({
  name: "blueprints",
  initialState,
  reducers: {
    setView(state, { payload: view }: PayloadAction<View>) {
      state.view = view;
    },
  },
});

export const persistBlueprintsConfig = {
  key: "blueprintsOptions",
  storage: localStorage,
};

export default blueprintsSlice;
