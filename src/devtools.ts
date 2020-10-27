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

const tabId = chrome.devtools.inspectedWindow.tabId;
console.log(`Start initializing devtools for tab ${tabId}`);

// https://developer.chrome.com/extensions/devtools_panels#method-create
// https://github.com/facebook/react/blob/master/packages/react-devtools-extensions/src/main.js#L298
chrome.devtools.panels.create(
  "PixieBrix Inspector",
  "",
  "panel.html",
  (extensionPanel) => {
    console.log("Devtools panel created");
  }
);

// Create a connection to the background page
// https://developer.chrome.com/extensions/devtools#detecting-open-close
const backgroundPageConnection = chrome.runtime.connect({
  name: "devtools-page",
});
