/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { browser, Runtime } from "webextension-polyfill-ts";
import { connect, PORT_NAME } from "@/background/devtools";

export async function connectDevtools(): Promise<Runtime.Port> {
  const tabId = browser.devtools.inspectedWindow.tabId;
  console.log(`Installing devtools for tab ${tabId}`);

  // Create a connection to the background page
  // https://developer.chrome.com/extensions/devtools#detecting-open-close
  const port = browser.runtime.connect(null, {
    name: PORT_NAME,
  });

  if (browser.runtime.lastError) {
    console.error("Cannot connect to background page", {
      error: browser.runtime.lastError,
    });
    return;
  } else if (!port) {
    console.error("Could not get connection port to background page");
    return;
  }

  console.debug("Injecting contentScript for devtools");

  await connect(port);

  return port;
}
