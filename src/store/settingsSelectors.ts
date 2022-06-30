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

import { SettingsState } from "./settingsTypes";
import { createSelector } from "reselect";

export type StateWithSettings = {
  settings: SettingsState;
};

export const selectUpdatePromptState = createSelector(
  [
    (state: StateWithSettings) => state.settings,
    (
      state: StateWithSettings,
      args: { now: number; enforceUpdateMillis: number | null }
    ) => args,
  ],
  (state, { now, enforceUpdateMillis }) => {
    const { nextUpdate, updatePromptTimestamps } = state;
    const {
      deployments: deploymentsTimestamp,
      browserExtension: browserExtensionTimestamp,
    } = updatePromptTimestamps ?? {};

    const isDeploymentUpdateOverdue =
      deploymentsTimestamp &&
      enforceUpdateMillis &&
      now - deploymentsTimestamp > enforceUpdateMillis;
    const isBrowserExtensionOverdue =
      browserExtensionTimestamp &&
      enforceUpdateMillis &&
      now - browserExtensionTimestamp > enforceUpdateMillis;

    return {
      isSnoozed: nextUpdate && nextUpdate > now,
      isBrowserExtensionOverdue,
      isDeploymentUpdateOverdue,
      deploymentsTimestamp,
      browserExtensionTimestamp,
    };
  }
);

export const selectSettings = ({ settings }: StateWithSettings) => settings;

export const selectBrowserWarningDismissed = ({
  settings,
}: StateWithSettings) => settings.browserWarningDismissed;
