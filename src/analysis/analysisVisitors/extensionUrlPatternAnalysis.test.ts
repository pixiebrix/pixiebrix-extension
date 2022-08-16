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

import ExtensionUrlPatternAnalysis, {
  INVALID_FILEPATH_MESSAGE,
  INVALID_HOST_MESSAGE,
  INVALID_SCHEME_MESSAGE,
  INVALID_URL_MESSAGE,
  REQUIRED_MESSAGE,
} from "./extensionUrlPatternAnalysis";

describe("analyzeStringUrlsField", () => {
  test.each([
    "https://pbx.vercel.app/*",
    "https://*.pbx.vercel.app/*",
    "https://*/*",
    "*://*/*",
  ])("accepts valid URL [%s]", async (url) => {
    const analysis = new ExtensionUrlPatternAnalysis();
    await analysis.analyzeStringUrlsField([url], "testField");

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  const invalidUrlsCases = [
    // Empty URL
    {
      url: undefined,
      message: REQUIRED_MESSAGE,
    },
    {
      url: null,
      message: REQUIRED_MESSAGE,
    },
    {
      url: "",
      message: REQUIRED_MESSAGE,
    },

    // Malformed URL
    {
      url: "invalid url",
      message: INVALID_URL_MESSAGE,
    },
    {
      url: "google.com",
      message: INVALID_URL_MESSAGE,
    },
    {
      url: "http:/bar",
      message: INVALID_URL_MESSAGE,
    },

    // Invalid scheme
    {
      url: "://google.com",
      message: INVALID_SCHEME_MESSAGE,
    },
    {
      url: "htps://google.com",
      message: INVALID_SCHEME_MESSAGE,
    },
    {
      url: "foo://*",
      message: INVALID_SCHEME_MESSAGE,
    },
    {
      url: "file://*",
      message: INVALID_SCHEME_MESSAGE,
    },

    {
      url: "ftp://*",
      message: INVALID_SCHEME_MESSAGE,
    },

    // Invalid host
    {
      url: "https://*.*",
      message: INVALID_HOST_MESSAGE,
    },
    {
      url: "https://",
      message: INVALID_HOST_MESSAGE,
    },
    {
      url: "https://foo.*.bar/baz",
      message: INVALID_HOST_MESSAGE,
    },
    {
      url: "https://*foo/bar",
      message: INVALID_HOST_MESSAGE,
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
