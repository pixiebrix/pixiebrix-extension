/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

// https://developer.chrome.com/extensions/devtools

import { browser } from "webextension-polyfill-ts";
import { connectDevtools } from "@/devTools/protocol";
import { readSelectedElement } from "@/background/devtools";
import { reportError } from "@/telemetry/logging";
import { updateSelectedElement } from "./devTools/getSelectedElement";
import { once } from "lodash";
import { serializeError } from "serialize-error";

window.addEventListener("error", (e) => {
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", (e) => {
  reportError(e);
});

const { onSelectionChanged } = browser.devtools.panels.elements;

async function updateElementProperties(): Promise<void> {
  // This call is instant because sidebar and port has connected earlier
  const { sidebar, port } = await connectSidebarPane();
  void sidebar.setObject({ state: "loading..." });
  try {
    await updateSelectedElement();
    await sidebar.setObject(await readSelectedElement(port));
  } catch (error: unknown) {
    await sidebar.setObject({ error: serializeError(error) });
  }
}

function onSidebarShow() {
  onSelectionChanged.addListener(updateElementProperties);
  void updateElementProperties();
}

function onSidebarHide() {
  onSelectionChanged.removeListener(updateElementProperties);
}

// This only ever needs to run once per devtools load. Sidebar and port will be constant throughout
const connectSidebarPane = once(async () => {
  const [sidebar, port] = await Promise.all([
    browser.devtools.panels.elements.createSidebarPane("PixieBrix Data Viewer"),
    connectDevtools(),
  ]);

  sidebar.onShown.addListener(onSidebarShow);
  sidebar.onHidden.addListener(onSidebarHide);

  console.debug("DevTools sidebar ready");
  return { sidebar, port };
});

if (browser.devtools.inspectedWindow.tabId) {
  // Add panel and sidebar as early as possible so they appear quickly
  void browser.devtools.panels.create("PixieBrix", "", "devtoolsPanel.html");
  void connectSidebarPane();
}
