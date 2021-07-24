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

import { browser, DevtoolsPanels, Runtime } from "webextension-polyfill-ts";
import { connectDevtools } from "@/devTools/protocol";
import {
  clearDynamicElements,
  ensureScript,
  readSelectedElement,
} from "@/background/devtools";
import { reportError } from "@/telemetry/logging";
import { updateSelectedElement } from "./devTools/getSelectedElement";

window.addEventListener("error", (e) => {
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", (e) => {
  reportError(e);
});

function initSidebarListeners(
  sidebar: DevtoolsPanels.ExtensionSidebarPane,
  port: Runtime.Port
): void {
  async function updateElementProperties(): Promise<void> {
    updateSelectedElement();

    void sidebar.setObject({ state: "loading..." });

    try {
      await sidebar.setObject(await readSelectedElement(port));
    } catch (error: unknown) {
      await sidebar.setObject({ error: error ?? "Unknown error" });
    }
  }

  void updateElementProperties();

  chrome.devtools.panels.elements.onSelectionChanged.addListener(
    updateElementProperties
  );
}

async function initialize() {
  // Add panel and sidebar components/elements first so their tabs appear quickly
  const [sidebar, , port] = await Promise.all([
    browser.devtools.panels.elements.createSidebarPane("PixieBrix Data Viewer"),
    browser.devtools.panels.create("PixieBrix", "", "devtoolsPanel.html"),
    connectDevtools(),
  ]);

  // Attach elements
  initSidebarListeners(sidebar, port);

  try {
    await ensureScript(port);

    // Clear out any dynamic stuff from any previous devtools sessions
    await clearDynamicElements(port, {}).catch((error: unknown) => {
      console.warn(
        "Error clearing dynamic elements from previous devtools sessions",
        {
          error,
        }
      );
    });
  } catch (error: unknown) {
    // We could install without having content script on the page; they just won't do much
    console.error("Could not inject contentScript for devtools", {
      error,
    });
  }
}

if (browser.devtools.inspectedWindow.tabId) {
  void initialize();
}
