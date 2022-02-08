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

import {
  safeGuessStatusText,
  selectAbsoluteUrl,
} from "@/services/requestErrorUtils";

describe("safeGuessStatusText", () => {
  it("returns http statusText", () => {
    expect(safeGuessStatusText(200)).toEqual("OK");
  });

  it("doesn't throw error on invalid code", () => {
    expect(safeGuessStatusText(-200)).toBeNull();
  });
});

describe("selectAbsoluteUrl", () => {
  it("combines URL", () => {
    expect(
      selectAbsoluteUrl({ url: "/foo", baseURL: "https://example.com" })
    ).toEqual("https://example.com/foo");
  });

  it("handles trailing baseURL slash", () => {
    expect(
      selectAbsoluteUrl({ url: "/foo", baseURL: "https://example.com/" })
    ).toEqual("https://example.com/foo");
  });

  it("handles absolute URL", () => {
    expect(
      selectAbsoluteUrl({
        url: "https://example.com/foo",
        baseURL: "https://example.com/",
      })
    ).toEqual("https://example.com/foo");
  });
});
