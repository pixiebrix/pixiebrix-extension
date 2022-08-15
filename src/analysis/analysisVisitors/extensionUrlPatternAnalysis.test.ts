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

import ExtensionUrlPatternAnalysis from "./extensionUrlPatternAnalysis";

describe("analyzeStringUrlsField", () => {
  test.each([
    "https://pbx.vercel.app/*",
    "https://*.pbx.vercel.app/*",
    "https://*/*",
    "*://*/*",
    "file:///c:/WINDOWS/clock.avi",
    "file:///etc/fstab",
  ])("accepts valid URL [%s]", async (url) => {
    const analysis = new ExtensionUrlPatternAnalysis();
    await analysis.analyzeStringUrlsField([url], "testField");

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  const invalidUrlsCases = [
    // Empty URL
    {
      url: undefined,
      message: "This field is required",
    },
    {
      url: null,
      message: "This field is required",
    },
    {
      url: "",
      message: "This field is required",
    },

    // Malformed URL
    {
      url: "invalid url",
      message: "Invalid URL",
    },
    {
      url: "google.com",
      message: "Invalid URL",
    },

    // Invalid scheme
    {
      url: "://google.com",
      message:
        "Invalid pattern for scheme. Scheme should match '*' | 'http' | 'https' | 'file' | 'ftp' | 'urn'",
    },
    {
      url: "htps://google.com",
      message:
        "Invalid pattern for scheme. Scheme should match '*' | 'http' | 'https' | 'file' | 'ftp' | 'urn'",
    },

    // Invalid host
    {
      url: "https://*.*",
      message:
        "Invalid pattern for host. Host name should match '*' | '*.' <any char except '/' and '*'>+",
    },
    {
      url: "https://",
      message:
        "Invalid pattern for host. Host name should match '*' | '*.' <any char except '/' and '*'>+",
    },

    // File URL
    {
      url: "file://",
      message:
        "Invalid pattern for file path. Path should not be empty for file:// URLs",
    },
  ];

  test.each(invalidUrlsCases)(
    "rejects invalid URL [$url]",
    async ({ url, message }) => {
      const analysis = new ExtensionUrlPatternAnalysis();
      await analysis.analyzeStringUrlsField([url], "testField");
      expect(analysis.getAnnotations()).toHaveLength(1);
      expect(analysis.getAnnotations()[0].message).toEqual(message);
    }
  );
});
