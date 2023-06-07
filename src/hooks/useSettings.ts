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

import { useState } from "react";
import { type SettingsState } from "@/store/settingsTypes";
import { getSettingsState } from "@/store/settingsStorage";
import useAsyncEffect from "use-async-effect";
import { initialSettingsState } from "@/store/settingsSlice";

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>(initialSettingsState);
  useAsyncEffect(async () => {
    const response = await getSettingsState();
    setSettings(response);
  }, []);

  return settings;
}
