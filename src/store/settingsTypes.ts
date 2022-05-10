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

import { THEMES } from "@/options/constants";

export type InstallMode = "local" | "remote";

export type SettingsState = SkunkworksSettings & {
  /**
   * Whether the extension is synced to the app for provisioning.*
   *
   * NOTE: `local` is broken in many places. The only current valid value is remote.
   */
  mode: InstallMode;

  /**
   * Time to snooze updates until (in milliseconds from the epoch), or null.
   *
   * The banners still show, however no modals will be shown for the browser extension or team deployments.
   */
  nextUpdate: number | null;

  /**
   * Whether the non-Chrome browser warning has been dismissed.
   */
  browserWarningDismissed: boolean;

  /**
   * Theme name for the extension
   */
  theme: typeof THEMES[number] | null;
};

export type SkunkworksSettings = {
  /**
   * Experimental feature to suggest HTML elements to select in the Page Editor
   */
  suggestElements?: boolean;

  /**
   * Experimental setting to detect and exclude random classes when generating selectors
   */
  excludeRandomClasses?: boolean;
};
