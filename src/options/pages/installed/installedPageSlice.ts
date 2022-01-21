/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { IExtension, MessageContext } from "@/core";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface LogsContext {
  title: string;
  messageContext: MessageContext;
}

export interface ShareContext {
  extension: IExtension;
}

export interface InstalledPageState {
  showLogsContext: LogsContext;
  showShareContext: ShareContext;
}

const initialState: InstalledPageState = {
  showLogsContext: null,
  showShareContext: null,
};

export const installedPageSlice = createSlice({
  name: "installedPage",
  initialState,
  reducers: {
    setLogsContext: (state, action: PayloadAction<LogsContext>) => {
      state.showLogsContext = action.payload;
    },
    setShareContext: (state, action: PayloadAction<ShareContext>) => {
      state.showShareContext = action.payload;
    },
  },
});
