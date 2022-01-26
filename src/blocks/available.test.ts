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

import { checkAvailable } from "@/blocks/available";

describe("isAvailable.urlPatterns", () => {
  test("can match hash", async () => {
    jsdom.reconfigure({ url: "https://www.example.com/#/foo/42" });
    expect(await checkAvailable({ urlPatterns: { hash: "/foo/:id" } })).toBe(
      true
    );
  });

  test("invalid baseURL", async () => {
    jsdom.reconfigure({ url: "https://www.example.com/#/foo/42" });
    await expect(
      checkAvailable({ urlPatterns: { baseURL: "NOTAREALURL" } })
    ).rejects.toThrow("Pattern for baseURL not recognized");
  });

  test("can reject hash", async () => {
    jsdom.reconfigure({ url: "https://www.example.com/#/MISMATCH/42" });
    expect(await checkAvailable({ urlPatterns: { hash: "/foo/:id" } })).toBe(
      false
    );
  });
});

describe("isAvailable.matchPatterns", () => {
  test("can match pattern", async () => {
    jsdom.reconfigure({ url: "https://www.example.com/foo/bar/baz/" });
    expect(
      await checkAvailable({ matchPatterns: "https://www.example.com/*" })
    ).toBe(true);
  });
});

describe("isAvailable.matchPatterns", () => {
  test("require urlPattern and matchPattern", async () => {
    jsdom.reconfigure({ url: "https://www.example.com/#/MISMATCH/42" });
    expect(
      await checkAvailable({
        matchPatterns: "https://www.example.com/*",
        urlPatterns: { hash: "/foo/:id" },
      })
    ).toBe(false);
  });
});
