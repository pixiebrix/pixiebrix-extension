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
/* eslint-disable unicorn/text-encoding-identifier-case -- Not applicable */

import parseDataUrl, { convertDataUrl } from "./parseDataUrl";
import { toUint8Array, uint8ArrayToString } from "uint8array-extras";

test("parseDataUrl", () => {
  expect(
    parseDataUrl("data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="),
  ).toStrictEqual({
    mimeType: "text/plain",
    mimeTypeEssence: "text/plain",
    charset: "US-ASCII",
    isBase64: true,
    encodedBody: "SGVsbG8sIFdvcmxkIQ==",
    body: "Hello, World!",
  });
  expect(parseDataUrl("data:,Hello%2C%20World%21")).toStrictEqual({
    mimeType: "text/plain",
    mimeTypeEssence: "text/plain",
    charset: "US-ASCII",
    isBase64: false,
    encodedBody: "Hello%2C%20World%21",
    body: "Hello, World!",
  });
  expect(
    parseDataUrl("data:text/html;charset=utf-8;base64,SGVsbG8sIFdvcmxkIQ=="),
  ).toStrictEqual({
    mimeType: "text/html;charset=utf-8",
    mimeTypeEssence: "text/html",
    charset: "utf-8",
    isBase64: true,
    encodedBody: "SGVsbG8sIFdvcmxkIQ==",
    body: "Hello, World!",
  });
  expect(
    parseDataUrl("data:text/html;charset=utf-8,Hello%2C%20World%21"),
  ).toStrictEqual({
    mimeType: "text/html;charset=utf-8",
    mimeTypeEssence: "text/html",
    charset: "utf-8",
    isBase64: false,
    encodedBody: "Hello%2C%20World%21",
    body: "Hello, World!",
  });
});

describe("convertDataUrl", () => {
  it("should convert base64 data url to Blob", async () => {
    const blob = convertDataUrl(
      "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
      "Blob",
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/plain");
    expect(blob.size).toBe(13);
    await expect(blob.text()).resolves.toBe("Hello, World!");
  });
  it("should convert base64 data url to ArrayBuffer", () => {
    const arrayBuffer = convertDataUrl(
      "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
      "ArrayBuffer",
    );
    expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(arrayBuffer.byteLength).toBe(13);
    expect(uint8ArrayToString(toUint8Array(arrayBuffer))).toBe("Hello, World!");
  });
});
