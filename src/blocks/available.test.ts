/**
 * @jest-environment-options { "url": "https://www.example.com/#/foo/42" }
 */

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

import { checkAvailable, testMatchPatterns } from "@/blocks/available";

describe("isAvailable.urlPatterns", () => {
  test("can match hash", async () => {
    expect(await checkAvailable({ urlPatterns: { hash: "/foo/:id" } })).toBe(
      true
    );
  });

  test("invalid baseURL", async () => {
    await expect(
      checkAvailable({ urlPatterns: { baseURL: "NOTAREALURL" } })
    ).rejects.toThrow("Pattern for baseURL not recognized");
  });

  test("can reject hash", async () => {
    expect(
      await checkAvailable({ urlPatterns: { hash: "/DIFFERENT/:id" } })
    ).toBe(false);
  });
});

describe("isAvailable.matchPatterns", () => {
  test("can match pattern", async () => {
    expect(
      await checkAvailable({ matchPatterns: "https://www.example.com/*" })
    ).toBe(true);
  });

  test("require urlPattern and matchPattern", async () => {
    expect(
      await checkAvailable({
        matchPatterns: "https://www.example.com/*",
        urlPatterns: { hash: "/DIFFERENT/:id" },
      })
    ).toBe(false);
  });
});

describe("testMatchPatterns", () => {
  test("can match pattern", async () => {
    const patterns = [
      "https://www.example.com/*",
      "https://*.pixiebrix.com/update/*",
    ];
    expect(testMatchPatterns(patterns, "https://www.example.com")).toBeTrue();
    expect(
      testMatchPatterns(patterns, "https://pixiebrix.com/update/")
    ).toBeTrue();

    expect(testMatchPatterns(patterns, "https://example.com")).toBeFalse();
    expect(
      testMatchPatterns(patterns, "https://www.example.comunication")
    ).toBeFalse();
    expect(
      testMatchPatterns(patterns, "https://www.pixiebrix.com/")
    ).toBeFalse();
  });

  test("will throw BusinessError or invalid patterns", async () => {
    const url = "irrelevant";
    expect(() =>
      testMatchPatterns(["https://pixiebrix.*/update/*"], url)
    ).toThrowErrorMatchingInlineSnapshot(
      '"Pattern not recognized as valid match pattern: https://pixiebrix.*/update/*"'
    );
    expect(() =>
      testMatchPatterns(["www.example.com/*"], url)
    ).toThrowErrorMatchingInlineSnapshot(
      '"Pattern not recognized as valid match pattern: www.example.com/*"'
    );
    expect(() =>
      testMatchPatterns(["*.example.com/*"], url)
    ).toThrowErrorMatchingInlineSnapshot(
      '"Pattern not recognized as valid match pattern: *.example.com/*"'
    );
  });
});
