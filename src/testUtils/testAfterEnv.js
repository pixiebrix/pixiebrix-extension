/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import "@testing-library/jest-dom";
import $ from "jquery";
import crypto from "crypto";

global.$ = $;
global.jQuery = $;

// Disable onMessage handler, or else it will respond to `sendMessage` calls locally
global.browser.runtime.onMessage.addListener = jest.fn();

// @ts-expect-error API missing from mock https://github.com/clarkbw/jest-webextension-mock/issues/148
browser.permissions = {
  contains: jest.fn(),
};

browser.runtime.getManifest = jest.fn().mockReturnValue({
  version: "1.5.2",
});

// https://stackoverflow.com/q/52612122/288906
globalThis.crypto = {
  getRandomValues: (array) => crypto.randomBytes(array.length),
};
