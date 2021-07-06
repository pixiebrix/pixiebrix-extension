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

// https://developer.chrome.com/extensions/devtools

import { browser, DevtoolsPanels, Runtime } from "webextension-polyfill-ts";
import { connectDevtools } from "@/devTools/protocol";
import {
  clearDynamicElements,
  ensureScript,
  readSelectedElement,
} from "@/background/devtools";
import { reportError } from "@/telemetry/logging";

window.addEventListener("error", function (e) {
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", function (e) {
  reportError(e);
});

function initSidebarListeners(
  sidebar: DevtoolsPanels.ExtensionSidebarPane,
  port: Runtime.Port
): void {
  async function updateElementProperties(): Promise<void> {
    // https://developer.chrome.com/extensions/devtools#selected-element
    chrome.devtools.inspectedWindow.eval("setSelectedElement($0)", {
      useContentScriptContext: true,
    });

    void sidebar.setObject({ state: "loading..." });

    try {
      await sidebar.setObject(await readSelectedElement(port));
    } catch (error) {
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

    // clear out any dynamic stuff from any previous devtools sessions
    await clearDynamicElements(port, {}).catch((error) => {
      console.warn(
        "Error clearing dynamic elements from previous devtools sessions",
        error
      );
    });
  } catch (error) {
    // Can install without having content script on the page; they just won't do much
    console.debug("Could not inject contextScript for devtools", {
      error,
    });
  }
}

if (browser.devtools.inspectedWindow.tabId) {
  void initialize();
}
