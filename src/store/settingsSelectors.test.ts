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
  it("calculates time remaining", () => {
    const now = Date.now();

    MockDate.set(now);

    const updatePromptTimestamp = now - 10;

    const settings: SettingsState = {
      ...settingsSlice.getInitialState(),
      updatePromptTimestamp,
    };

    const result = selectUpdatePromptState(
      { settings },
      { now, enforceUpdateMillis: 5 }
    );
    expect(result).toStrictEqual({
      isSnoozed: false,
      updatePromptTimestamp,
      isUpdateOverdue: true,
      timeRemaining: -5,
    });
  });

  it("snooze independent of deployment enforcement", () => {
    const now = Date.now();

    MockDate.set(now);

    const updatePromptTimestamp = now - 1;

    const settings: SettingsState = {
      ...settingsSlice.getInitialState(),
      nextUpdate: now + 3,
      updatePromptTimestamp,
    };

    const result = selectUpdatePromptState(
      { settings },
      { now, enforceUpdateMillis: 1 }
    );
    expect(result).toStrictEqual({
      isSnoozed: true,
      updatePromptTimestamp,
      isUpdateOverdue: true,
      timeRemaining: 0,
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
      timeRemaining: Number.MAX_SAFE_INTEGER,
      isUpdateOverdue: false,
    });
  });
});
