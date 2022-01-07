/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import MIMEType from "whatwg-mimetype";
import { safeParseUrl } from "@/utils";

const base64Ending = /; *base64$/; // Step 11, 11.4, 11.5

// Vocabulary from https://www.npmjs.com/package/whatwg-mimetype
interface ParsedDataURL {
  /**
   * The content of the URL after URL-decoding and base64-decoding, if any; it may be binary data
   * @example "Hello world"
   * @example "GIF89aÿÿÿ!ù,D;"
   */
  body: string;

  /**
   * The content of the URL before URL-decoding and base64-decoding, if any
   * @example "Hello%20world"
   * @example "R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
   */
  encodedBody: string;

  /**
   * The full MIME type string
   * @example "text/html;charset=utf-8"
   */
  mimeType: string;

  /** @example text/html */
  mimeTypeEssence: string;

  /**
   * The original text encoding of the body in the string. If unspecified (like for base64 data), it's "windows-1252", the spec’s name for ASCII
   * @example "utf-8"
   * @default "windows-1252"
   */
  charset: string;
}

export default function parseDataUrl(url: string): ParsedDataURL | void {
  // Following https://fetch.spec.whatwg.org/#data-urls
  const { protocol, pathname } = safeParseUrl(url); // Step 2, 3, 4
  if (protocol !== "data:") {
    // Step 1
    return;
  }

  const commaPosition = pathname.indexOf(","); // Step 5
  if (commaPosition < 0) {
    return; // Step 7
  }

  let mimeType = pathname.slice(0, commaPosition).trim(); // Step 6
  const isBase64 = base64Ending.test(mimeType); // Step 11
  if (isBase64) {
    // Must double-trim to follow the steps exactly, without changing the regex
    mimeType = mimeType.trim().replace(base64Ending, "").trim(); // Step 11.4, 11.5, 11.6
  } else if (mimeType === "") {
    mimeType = "text/plain"; // Step 12
  }

  const encodedBody = pathname.slice(commaPosition + 1); // Step 8, 9
  let body = decodeURIComponent(encodedBody); // Step 10
  if (isBase64) {
    try {
      body = atob(body); // Step 11.2
    } catch {
      return; // Step 11.3
    }
  }

  const parsedMimeType = new MIMEType(mimeType);

  return {
    body,
    encodedBody,
    mimeType: String(parsedMimeType),
    mimeTypeEssence: parsedMimeType.essence,
    charset: parsedMimeType.parameters.get("charset") ?? "US-ASCII", // Step 14
  };
}
