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

/* eslint-disable import/no-unassigned-import -- Self-registering scripts */
import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import "blob-polyfill";
import $ from "jquery";
// Mock `window.location` with Jest spies and extend expect
// https://github.com/evelynhathaway/jest-location-mock
import "jest-location-mock";
import "./permissionsMock";
import * as detectPageMock from "./detectPageMock";

// @ts-expect-error For testing only
global.$ = $;
// @ts-expect-error For testing only
global.jQuery = $;

// Disable onMessage handler, or else it will respond to `sendMessage` calls locally
// @ts-expect-error For testing only
global.browser.runtime.onMessage.addListener = jest.fn();

browser.runtime.getManifest = jest.fn().mockReturnValue({
  version: "1.5.2",
});

browser.runtime.getURL = (path) => `chrome-extension://abcxyz/${path}`;

// `jest-webextension-mock` is missing mocks for onRemoved: https://github.com/clarkbw/jest-webextension-mock/pull/180
browser.tabs.onRemoved = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
  hasListeners: jest.fn(),
};

// `jest-webextension-mock` is missing mocks for onChanged: https://github.com/clarkbw/jest-webextension-mock/issues/170
// `webext-storage` uses the chrome namespace: https://github.com/fregante/webext-storage/blob/main/source/storage-item.ts#L63
chrome.storage.onChanged = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
  hasListeners: jest.fn(),
  getRules: jest.fn(),
  removeRules: jest.fn(),
  addRules: jest.fn(),
};

jest.setMock("webext-detect-page", detectPageMock);

// For some reason, throwIfAborted is not available in Jest environment even though it appears to be in JSDOM
// https://github.com/jsdom/jsdom/blob/2f8a7302a43fff92f244d5f3426367a8eb2b8896/lib/jsdom/living/aborting/AbortSignal-impl.js#L24
AbortSignal.prototype.throwIfAborted = function () {
  if (this.aborted) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal -- copy implementation from JSDOM
    throw this.reason;
  }
};
