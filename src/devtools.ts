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

import { browser, Runtime } from "webextension-polyfill-ts";
import { connectDevtools } from "@/devTools/protocol";

import {
  injectScript,
  readSelectedElement,
  clearDynamicElements,
} from "@/background/devtools/index";
import { reportError } from "@/telemetry/logging";

window.addEventListener("error", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
});

async function installSidebarPane(port: Runtime.Port) {
  // TODO: Drop type assertion after https://github.com/Lusito/webextension-polyfill-ts/issues/60
  const sidebar = ((await browser.devtools.panels.elements.createSidebarPane(
    "PixieBrix Data Viewer"
  )) as any) as chrome.devtools.panels.ExtensionSidebarPane;

  async function updateElementProperties() {
    // https://developer.chrome.com/extensions/devtools#selected-element
    chrome.devtools.inspectedWindow.eval("setSelectedElement($0)", {
      useContentScriptContext: true,
    });

    sidebar.setObject({ state: "loading..." });

    try {
      sidebar.setObject(await readSelectedElement(port));
    } catch (reason) {
      sidebar.setObject({ error: reason ?? "Unknown error" });
    }
  }
  updateElementProperties();
  chrome.devtools.panels.elements.onSelectionChanged.addListener(
    updateElementProperties
  );
}

function installPanel() {
  // https://developer.chrome.com/extensions/devtools_panels#method-create
  // https://github.com/facebook/react/blob/master/packages/react-devtools-extensions/src/main.js#L298

  let currentPanel = null;

  chrome.devtools.panels.create(
    "PixieBrix",
    "",
    "devtoolsPanel.html",
    (panel) => {
      currentPanel = panel;
      if (currentPanel === panel) {
        return;
      }
    }
  );
}

async function initialize() {
  const port = await connectDevtools();
  let injected = false;

  try {
    await injectScript(port, { file: "contentScript.js" });
    injected = true;
  } catch (reason) {
    // Can install without having content script on the page; they just won't do much
    console.debug("Could not inject contextScript for devtools", { reason });
  }

  installSidebarPane(port);
  installPanel();

  if (injected) {
    try {
      // clear out any dynamic stuff from a previous devtools session
      await clearDynamicElements(port, {});
    } catch (err) {
      console.debug(
        "Error clearing dynamic elements previous devtools sessions",
        err
      );
    }
  }
}

if (browser.devtools.inspectedWindow.tabId) {
  initialize().catch(reportError);
}
