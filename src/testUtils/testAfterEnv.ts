/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

// This is no longer needed since we're using uuid library for uuid generation. But keep here since the trick
// might be hard to find in the future if we need it
// https://stackoverflow.com/q/52612122/288906
// globalThis.crypto = {
//   getRandomValues: (array) => crypto.randomBytes(array.length),
// };

jest.setMock("webext-detect-page", detectPageMock);
