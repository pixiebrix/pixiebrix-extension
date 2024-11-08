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

import manifestJson from "../manifest.json";
import {
  openShortcutsTab,
  getExtensionConsoleUrl,
} from "./extensionUtils";

describe("openShortcutsTabs", () => {
  it("defaults to quickbar shortcut", async () => {
    jest
      .mocked(browser.runtime.getManifest)
      .mockReturnValue(manifestJson as any);
    await openShortcutsTab();
    expect(browser.tabs.create).toHaveBeenCalledExactlyOnceWith({
      url: "chrome://extensions/shortcuts#:~:text=Toggle%20Quick%20Bar",
    });
  });
});

describe("getExtensionConsoleUrl", () => {
  it("returns the options page URL", () => {
    expect(getExtensionConsoleUrl()).toBe(
      "chrome-extension://abcxyz/options.html",
    );
  });

  it("returns the options page URL with a hash", () => {
    expect(getExtensionConsoleUrl("test/sub")).toBe(
      "chrome-extension://abcxyz/options.html#/test/sub",
    );
  });

  it("returns the options page URL with a leading slash", () => {
    expect(getExtensionConsoleUrl("/test?param=123")).toBe(
      "chrome-extension://abcxyz/options.html#/test?param=123",
    );
  });
});
