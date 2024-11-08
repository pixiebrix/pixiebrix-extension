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

import { type RegistryId } from "@/types/registryTypes";
import {
  generatePackageId,
  getScopeAndId,
  isInternalRegistryId,
} from "@/utils/registryUtils";
import { validateRegistryId } from "@/types/helpers";
import { createNewUnsavedModMetadata } from "@/utils/modUtils";

describe("isInternalRegistryId", () => {
  it("returns true for internal registry ids", () => {
    expect(
      isInternalRegistryId(createNewUnsavedModMetadata({ modName: "Mod" }).id),
    ).toBe(true);
  });

  it("returns false for custom registry ids", () => {
    expect(isInternalRegistryId(validateRegistryId("@internal1/foo"))).toBe(
      false,
    );
  });
});

describe("generatePackageId", () => {
  test("no special chars", () => {
    expect(generatePackageId("@test", "This Is a Test")).toBe(
      "@test/this-is-a-test",
    );
  });

  test("handle colon", () => {
    expect(generatePackageId("@test", "This: Is a Test")).toBe(
      "@test/this-is-a-test",
    );
  });

  test("collapse spaces", () => {
    expect(generatePackageId("@test", "This   Is a Test")).toBe(
      "@test/this-is-a-test",
    );
  });

  test("return empty on invalid", () => {
    expect(generatePackageId("", "This   Is a Test")).toBe("");
  });
});

describe("getScopeAndId", () => {
  test("normal id", () => {
    const id = "@foo/bar" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual({ scope: "@foo", id: "bar" });
  });
  test("id with slash", () => {
    const id = "@foo/bar/baz" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual({ scope: "@foo", id: "bar/baz" });
  });
  test("id without scope", () => {
    const id = "foobar" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual({ scope: undefined, id: "foobar" });
  });
  test("id without scope with slash", () => {
    const id = "foo/bar/baz" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual({
      scope: undefined,
      id: "foo/bar/baz",
    });
  });
  test("scope without id", () => {
    const id = "@foo" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual({ scope: "@foo", id: undefined });
  });
});
