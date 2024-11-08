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
import {
  AUTH_METHODS,
  type SettingsFlags,
  type SettingsState,
} from "./settingsTypes";
import { DEFAULT_THEME } from "../../themes/themeTypes";
import { type RegistryId } from "../../types/registryTypes";
import { isRegistryId } from "../../types/helpers";
import { revertAll } from "../commonActions";
import { activateTheme } from "../../background/messenger/api";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect } from "react";
import { selectSettings } from "./settingsSelectors";

export const initialSettingsState: SettingsState = {
  nextUpdate: null,
  suggestElements: false,
  browserWarningDismissed: false,
  /**
   * @since 1.8.11 default to true
   */
  textSelectionMenu: true,
  /**
   * @since 1.8.11 default to true
   */
  snippetShortcutMenu: true,
  /**
   * @since 1.8.6 default to true
   */
  // The variable popover was GA in 1.8.4; we wrote a migration to turn it on for existing installs, but forgot
  // to update it here for new installations.
  varAutosuggest: true,
  /**
   * True to enable the floating action button, if the user is not an enterprise/partner user.
   * @since 1.7.35 default to true
   */
  isFloatingActionButtonEnabled: true,
  partnerId: null,
  authMethod: null,
  authIntegrationId: null,
  /**
   * @deprecated - instead get themeName from useTheme / themeStorage
   */
  theme: DEFAULT_THEME,
  updatePromptTimestamp: null,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState: initialSettingsState,
  reducers: {
    setFlag(
      state,
      action: PayloadAction<{
        flag: keyof SettingsFlags;
        value: boolean;
      }>,
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
    setFloatingActionButtonEnabled(state, { payload }: { payload: boolean }) {
      state.isFloatingActionButtonEnabled = payload;
    },
    setPartnerId(
      state,
      { payload: { partnerId } }: { payload: { partnerId: string } },
    ) {
      state.partnerId = partnerId;
    },
    setAuthIntegrationId(
      state,
      {
        payload: { integrationId },
      }: { payload: { integrationId: RegistryId | null } },
    ) {
      // Ensure valid data for authServiceId
      state.authIntegrationId =
        integrationId && isRegistryId(integrationId) ? integrationId : null;
    },
    setAuthMethod(
      state,
      { payload: { authMethod } }: { payload: { authMethod: string } },
    ) {
      // Ignore invalid values
      if (AUTH_METHODS.includes(authMethod)) {
        state.authMethod = authMethod as SettingsState["authMethod"];
      } else {
        state.authMethod = null;
      }
    },
    recordUpdatePromptTimestamp(state) {
      // Don't overwrite the old timestamp
      state.updatePromptTimestamp ??= Date.now();
    },
    resetUpdatePromptTimestamp(state) {
      state.updatePromptTimestamp = null;
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialSettingsState);
  },
});

/**
 * Updates the partnerId in settingsState and calls `activateTheme` which
 * triggers updating themeStorage in the background script.
 * @see activateTheme
 */
export const useActivatePartnerTheme = (): ((
  partnerId: string | null,
) => void) => {
  const dispatch = useDispatch();
  const { partnerId } = useSelector(selectSettings);

  useEffect(() => {
    if (partnerId) {
      void activateTheme();
    }
  }, [partnerId]);

  return useCallback(
    (partnerId: string) => {
      dispatch(settingsSlice.actions.setPartnerId({ partnerId }));
    },
    [dispatch],
  );
};

export default settingsSlice;
