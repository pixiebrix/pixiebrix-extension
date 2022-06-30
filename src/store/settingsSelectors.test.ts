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

import MockDate from "mockdate";
import { selectUpdatePromptState } from "@/store/settingsSelectors";
import settingsSlice from "@/store/settingsSlice";
import { SettingsState } from "@/store/settingsTypes";

describe("selectUpdatePromptState", () => {
  it("snooze independent of deployment enforcement", () => {
    const now = Date.now();

    MockDate.set(now);

    const timestamp = now - 2;

    const settings: SettingsState = {
      ...settingsSlice.getInitialState(),
      nextUpdate: now + 3,
      updatePromptTimestamp: timestamp,
    };

    const result = selectUpdatePromptState(
      { settings },
      { now, enforceUpdateMillis: 1 }
    );
    expect(result).toStrictEqual({
      isSnoozed: true,
      updatePromptTimestamp: timestamp,
      isUpdateOverdue: true,
    });
  });

  it("no snooze or previous prompt", () => {
    const now = Date.now();

    MockDate.set(now);

    const settings: SettingsState = {
      ...settingsSlice.getInitialState(),
      nextUpdate: null,
      updatePromptTimestamp: null,
    };

    const result = selectUpdatePromptState(
      { settings },
      { now, enforceUpdateMillis: 1 }
    );
    expect(result).toStrictEqual({
      isSnoozed: false,
      updatePromptTimestamp: null,
      isUpdateOverdue: false,
    });
  });
});
