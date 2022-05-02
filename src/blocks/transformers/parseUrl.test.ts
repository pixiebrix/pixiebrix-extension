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

import { UrlParser } from "@/blocks/transformers/parseUrl";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { BusinessError } from "@/errors";

describe("parseUrl", () => {
  it("parses absolute URL", async () => {
    const url = new URL("https://www.example.com");

    // Use `toMatchInlineSnapshot` since we can't spread the URL instance to get its properties
    await expect(
      new UrlParser().transform(unsafeAssumeValidArg({ url: url.href }))
    ).resolves.toMatchInlineSnapshot(`
      Object {
        "hash": "",
        "host": "www.example.com",
        "hostname": "www.example.com",
        "origin": "https://www.example.com",
        "password": "",
        "pathname": "/",
        "port": "",
        "protocol": "https:",
        "publicSuffix": "example.com",
        "search": "",
        "searchParams": Object {},
        "username": "",
      }
    `);
  });

  it("parses relative URL with search params", async () => {
    // Use `toMatchInlineSnapshot` since we can't spread the URL instance to get its properties
    await expect(
      new UrlParser().transform(
        unsafeAssumeValidArg({
          url: "/api/foo/?bar=42",
          base: "https://www.example.com",
        })
      )
    ).resolves.toMatchInlineSnapshot(`
      Object {
        "hash": "",
        "host": "www.example.com",
        "hostname": "www.example.com",
        "origin": "https://www.example.com",
        "password": "",
        "pathname": "/api/foo/",
        "port": "",
        "protocol": "https:",
        "publicSuffix": "example.com",
        "search": "?bar=42",
        "searchParams": Object {
          "bar": "42",
        },
        "username": "",
      }
    `);
  });

  it("throws BusinessError for malformed URL", async () => {
    const promise = new UrlParser().transform(
      unsafeAssumeValidArg({ url: "42" })
    );
    await expect(promise).rejects.toThrowError(BusinessError);
    await expect(promise).rejects.toThrowError("Invalid URL: 42");
  });
});
