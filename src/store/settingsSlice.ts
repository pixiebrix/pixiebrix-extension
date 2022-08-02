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
import reportError from "@/telemetry/reportError";
import { once } from "lodash";
import { DEFAULT_THEME } from "@/options/types";
import { isValidTheme } from "@/utils/themeUtils";
import { RegistryId } from "@/core";

export const initialSettingsState: SettingsState = {
  mode: "remote",
  nextUpdate: null as number,
  suggestElements: false,
  browserWarningDismissed: false,
  partnerId: null,
  authServiceId: null,
  theme: DEFAULT_THEME,
  updatePromptTimestamp: null,
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
    setPartnerId(
      state,
      { payload: { partnerId } }: { payload: { partnerId: string } }
    ) {
      state.partnerId = partnerId;
    },
    setAuthServiceId(
      state,
      { payload: { serviceId } }: { payload: { serviceId: RegistryId } }
    ) {
      state.authServiceId = serviceId;
    },
    recordUpdatePromptTimestamp(state) {
      // Don't overwrite the old timestamp
      if (state.updatePromptTimestamp == null) {
        state.updatePromptTimestamp = Date.now();
      }
    },
    resetUpdatePromptTimestamp(state) {
      state.updatePromptTimestamp = null;
    },
    setTheme(state, { payload: { theme } }: { payload: { theme: string } }) {
      if (isValidTheme(theme)) {
        state.theme = theme;
        return;
      }

      state.theme = DEFAULT_THEME;

      once(() => {
        reportError(`Selected theme "${theme}" doesn't exist.`);
      });
    },
  },
});

export default settingsSlice;
