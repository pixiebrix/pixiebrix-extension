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

import { toggleQuickBar } from "@/contentScript/messenger/api";
import { type Tab } from "@/mv3/api";
import { type Target } from "@/types/messengerTypes";
import { expectContext } from "@/utils/expectContext";
import { isScriptableUrl } from "@/utils/permissions";
import { ensureContentScript } from "./contentScript";

async function handleCommand(command: string, tab: Tab): Promise<void> {
  if (command !== "toggle-quick-bar" || !isScriptableUrl(tab.url)) {
    return;
  }

  const target: Target = {
    tabId: tab.id,
    frameId: 0,
  };

  await ensureContentScript(target);
  await toggleQuickBar(target);
}

export default function initBrowserCommands(): void {
  expectContext("background");
  browser.commands.onCommand.addListener(handleCommand);
}
