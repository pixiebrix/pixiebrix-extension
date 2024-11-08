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

import {
  createActivationRelativeUrl,
  createActivationUrl,
  getNextUrlFromActivateUrl,
  getRegistryIdsFromActivateUrlSearchParams,
  isActivationUrl,
  parseModActivationUrlSearchParams,
} from "@/activation/activationLinkUtils";
import { validateRegistryId } from "@/types/helpers";

describe("createActivationUrl", () => {
  test("single id", () => {
    expect(
      createActivationUrl([
        { modId: validateRegistryId("test/123"), initialOptions: {} },
      ]).toString(),
    ).toBe("https://app.pixiebrix.com/activate?id%5B%5D=test%2F123");
  });

  test("multiple ids", () => {
    expect(
      createActivationUrl([
        { modId: validateRegistryId("test/123"), initialOptions: {} },
        { modId: validateRegistryId("test/abc"), initialOptions: {} },
      ]).toString(),
    ).toBe(
      "https://app.pixiebrix.com/activate?id%5B%5D=test%2F123&id%5B%5D=test%2Fabc",
    );
  });
});

describe("createActivationRelativeUrl", () => {
  test("throws for no mods", () => {
    expect(() => {
      createActivationRelativeUrl([]);
    }).toThrow(Error);
  });

  test("single id with no options", () => {
    expect(
      createActivationRelativeUrl([
        { modId: validateRegistryId("test/123"), initialOptions: {} },
      ]).toString(),
    ).toBe("/activate?id%5B%5D=test%2F123");
  });

  test("single id with options", () => {
    expect(
      createActivationRelativeUrl([
        { modId: validateRegistryId("test/123"), initialOptions: { foo: 42 } },
      ]).toString(),
    ).toBe(
      "/activate?id%5B%5D=test%2F123&activateOptions=eyJmb28iOjQyfQ%3D%3D",
    );
  });

  test("single id redirect", () => {
    expect(
      createActivationRelativeUrl(
        [{ modId: validateRegistryId("test/123"), initialOptions: {} }],
        { nextUrl: "https://www.pixiebrix.com" },
      ).toString(),
    ).toBe(
      "/activate?id%5B%5D=test%2F123&nextUrl=https%3A%2F%2Fwww.pixiebrix.com",
    );
  });

  test("multiple id with options", () => {
    expect(
      createActivationRelativeUrl([
        { modId: validateRegistryId("test/123"), initialOptions: { foo: 42 } },
        { modId: validateRegistryId("test/abc"), initialOptions: { foo: 42 } },
      ]).toString(),
    ).toBe(
      "/activate?id%5B%5D=test%2F123&id%5B%5D=test%2Fabc&activateOptions=eyJmb28iOjQyfQ%3D%3D",
    );
  });
});

describe("isActivationUrl", () => {
  test("single id", () => {
    expect(
      isActivationUrl("https://app.pixiebrix.com/activate?id=test%2F123"),
    ).toBe(true);
  });

  test("login url", () => {
    expect(isActivationUrl("https://app.pixiebrix.com/login")).toBe(false);
  });
});

describe("getRegistryIdsFromActivateUrlSearchParams", () => {
  test("handles id and id[]", () => {
    expect(
      getRegistryIdsFromActivateUrlSearchParams(
        new URLSearchParams("id=test%2F123&id[]=test%2Fabc"),
      ),
    ).toStrictEqual(["test/123", "test/abc"]);
  });
});

describe("getNextUrlFromActivateUrl", () => {
  test("handles next URL", () => {
    expect(
      getNextUrlFromActivateUrl(
        `https://app.pixiebrix.com/activate?id=test%2F123&nextUrl=${encodeURIComponent(
          "https://www.pixiebrix.com",
        )}`,
      ),
    ).toBe("https://www.pixiebrix.com");
  });

  test("returns null for no URL", () => {
    expect(
      getNextUrlFromActivateUrl(
        "https://app.pixiebrix.com/activate?id=test%2F123",
      ),
    ).toBeNull();
  });
});

describe("parseModActivationUrlSearchParams", () => {
  test("handles no options", () => {
    expect(
      parseModActivationUrlSearchParams(new URLSearchParams("id=test%2F123")),
    ).toStrictEqual([{ modId: "test/123", initialOptions: {} }]);
  });

  test("handles encoded options", () => {
    expect(
      parseModActivationUrlSearchParams(
        new URLSearchParams(
          `id=test%2F123&activateOptions=${encodeURIComponent(
            "eyJmb28iOiA0Mn0=",
          )}`,
        ),
      ),
    ).toStrictEqual([{ modId: "test/123", initialOptions: { foo: 42 } }]);
  });

  test("spreads encoded options", () => {
    expect(
      parseModActivationUrlSearchParams(
        new URLSearchParams(
          `id[]=test%2F123&id[]=test%2Fabc&activateOptions=${encodeURIComponent(
            "eyJmb28iOiA0Mn0=",
          )}`,
        ),
      ),
    ).toStrictEqual([
      { modId: "test/123", initialOptions: { foo: 42 } },
      { modId: "test/abc", initialOptions: { foo: 42 } },
    ]);
  });
});
