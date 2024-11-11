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

import {
  reloadModsEveryTab,
  queueReloadModEveryTab,
} from "@/contentScript/messenger/api";
import { saveModComponentState } from "@/store/modComponents/modComponentStorage";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";

export type ReloadOptions = {
  /**
   * When to reload mods on existing tabs/frames
   * @since 2.0.5
   */
  reloadMode: "queue" | "immediate";
};

async function saveModComponentStateAndReloadTabs(
  state: ModComponentState,
  { reloadMode }: ReloadOptions,
): Promise<void> {
  await saveModComponentState(state);

  if (reloadMode === "immediate") {
    reloadModsEveryTab();
  } else {
    queueReloadModEveryTab();
  }
}

export default saveModComponentStateAndReloadTabs;
