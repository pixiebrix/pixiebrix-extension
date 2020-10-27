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

// https://developer.chrome.com/extensions/devtools#detecting-open-close
let openCount = 0;
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "devtools-page") {
    if (openCount === 0) {
      console.log("DevTools window opening.");
    }
    openCount++;

    port.onDisconnect.addListener(function (port) {
      openCount--;
      if (openCount === 0) {
        console.log("Last DevTools window closing.");
      }
    });
  }
});

// https://developer.chrome.com/extensions/devtools#content-script-to-devtools
const devtoolConnections = {};
chrome.runtime.onConnect.addListener(function (port) {
  const extensionListener = function (message, sender, sendResponse) {
    // The original connection event doesn't include the tab ID of the
    // DevTools page, so we need to send it explicitly.
    switch (message.name) {
      case "init": {
        devtoolConnections[message.tabId] = port;
        return;
      }
      default: {
        return;
      }
    }
  };

  // Listen to messages sent from the DevTools page
  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function (port) {
    port.onMessage.removeListener(extensionListener);

    const tabs = Object.keys(devtoolConnections);
    for (let i = 0, len = tabs.length; i < len; i++) {
      if (devtoolConnections[tabs[i]] === port) {
        delete devtoolConnections[tabs[i]];
        break;
      }
    }
  });
});

// Receive message from content script and relay to the devTools page for the current tab
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Messages from content scripts should have sender.tab set
  if (sender.tab) {
    const tabId = sender.tab.id;
    if (tabId in devtoolConnections) {
      devtoolConnections[tabId].postMessage(request);
    } else {
      console.debug("Tab not found in connection list.");
    }
  } else {
    console.debug("sender.tab not defined.");
  }
  return true;
});
