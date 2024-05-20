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

import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

// Only add the Page Editor to the devtools if it's being used to inspect a modifiable web page,
// i.e. the Page Editor is not relevant when inspecting a background page or the devtools itself.
if (typeof chrome.devtools.inspectedWindow.tabId === "number") {
  reportEvent(Events.DEVTOOLS_OPEN);

  window.addEventListener("beforeunload", () => {
    reportEvent(Events.DEVTOOLS_CLOSE);
  });

  chrome.devtools.panels.create(
    process.env.IS_BETA ? "PixieBrix BETA" : "PixieBrix",
    "",
    `pageEditor.html?tabId=${chrome.devtools.inspectedWindow.tabId}`,
  );
}
