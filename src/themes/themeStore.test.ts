/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { saveSettingsState } from "@/store/settings/settingsStorage";
import { initialSettingsState } from "@/store/settings/settingsSlice";
import {
  INTERNAL_reset as resetManagedStorage,
  readManagedStorage,
} from "@/store/enterprise/managedStorage";
import { getActiveTheme } from "@/themes/themeStore";

afterEach(() => {
  resetManagedStorage();
});

describe("getActiveTheme", () => {
  it("prefers managed storage", async () => {
    await browser.storage.managed.set({
      partnerId: "automation-anywhere",
    });

    // XXX: waiting for managed storage initialization seems to be necessary to avoid test interference when
    // run with other tests. We needed to add it after some seemingly unrelated changes:
    // See test suite changes in : https://github.com/pixiebrix/pixiebrix-extension/pull/6134/
    await readManagedStorage();

    await saveSettingsState(initialSettingsState);

    await expect(getActiveTheme()).resolves.toEqual("automation-anywhere");
  });
});
