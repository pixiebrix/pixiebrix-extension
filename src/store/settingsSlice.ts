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
import { SettingsState, SkunkworksSettings } from "@/store/settingsTypes";

const initialSettingsState: SettingsState = {
  mode: "remote",
  nextUpdate: null as number,
  suggestElements: false,
  browserWarningDismissed: false,
  theme: undefined,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState: initialSettingsState,
  reducers: {
    setMode(state, { payload: { mode } }) {
      state.mode = mode;
    },
    setFlag(
      state,
      action: PayloadAction<{
        flag: keyof SkunkworksSettings;
        value: boolean;
      }>
    ) {
      const { flag, value } = action.payload;
      // eslint-disable-next-line security/detect-object-injection -- type checked
      state[flag] = value;
    },
    snoozeUpdates(state, action: PayloadAction<{ durationMillis: number }>) {
      const { durationMillis } = action.payload;
      state.nextUpdate = Date.now() + durationMillis;
    },
    dismissBrowserWarning(state) {
      state.browserWarningDismissed = true;
    },
    setTheme(state, { payload: { theme } }) {
      state.theme = theme;
    },
  },
});

export default settingsSlice;
