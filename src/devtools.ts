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
  ensureScript,
  readSelectedElement,
  clearDynamicElements,
} from "@/background/devtools/index";
import { reportError } from "@/telemetry/logging";

window.addEventListener("error", function (e) {
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", function (e) {
  reportError(e);
});

async function keepSidebarUpToDate(
  sidebar: DevtoolsPanels.ExtensionSidebarPane,
  port: Runtime.Port
) {
  async function updateElementProperties(): Promise<void> {
    // https://developer.chrome.com/extensions/devtools#selected-element
    chrome.devtools.inspectedWindow.eval("setSelectedElement($0)", {
      useContentScriptContext: true,
    });

    sidebar.setObject({ state: "loading..." });

    try {
      sidebar.setObject(await readSelectedElement(port));
    } catch (error) {
      sidebar.setObject({ error: error ?? "Unknown error" });
    }
  }

  // IntelliJ doesn't always respect void keyword: https://youtrack.jetbrains.com/issue/WEB-50191
  // noinspection ES6MissingAwait
  void updateElementProperties();

  chrome.devtools.panels.elements.onSelectionChanged.addListener(
    updateElementProperties
  );
}

async function initialize() {
  // Add panel and sidebar
  await browser.devtools.panels.create("PixieBrix", "", "devtoolsPanel.html");
  const sidebar = await browser.devtools.panels.elements.createSidebarPane(
    "PixieBrix Data Viewer"
  );

  const port = await connectDevtools();
  keepSidebarUpToDate(sidebar, port).catch((error) => {
    console.error("Error adding data viewer elements pane", { error });
  });

  let injected = false;

  try {
    await ensureScript(port);
    injected = true;
  } catch (error) {
    // Can install without having content script on the page; they just won't do much
    console.debug("Could not inject contextScript for devtools", {
      error,
    });
  }

  if (injected) {
    try {
      // clear out any dynamic stuff from any previous devtools sessions
      await clearDynamicElements(port, {});
    } catch (error) {
      console.debug(
        "Error clearing dynamic elements previous devtools sessions",
        error
      );
    }
  }
}

if (browser.devtools.inspectedWindow.tabId) {
  void initialize();
}
