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

import React from "react";
import RegistryIdWidget, {
  getScopeAndId,
} from "@/components/form/widgets/RegistryIdWidget";
import { RegistryId } from "@/core";
import { render, screen } from "@/testUtils/testHelpers";
import { authActions } from "@/auth/authSlice";
import testFactory from "@/testUtils/testFactory";

describe("getScopeAndId", () => {
  test("normal id", () => {
    const id = "@foo/bar" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual(["@foo", "bar"]);
  });
  test("id with slash", () => {
    const id = "@foo/bar/baz" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual(["@foo", "bar/baz"]);
  });
  test("id without scope", () => {
    const id = "foobar" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual([undefined, "foobar"]);
  });
  test("id without scope with slash", () => {
    const id = "foo/bar/baz" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual([undefined, "foo/bar/baz"]);
  });
  test("scope without id", () => {
    const id = "@foo" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual(["@foo", undefined]);
  });
});

jest.unmock("react-redux");

describe("RegistryIdWidget", () => {
  test("renders with user id value", async () => {
    const testUserScope = "@userFoo";
    const testIdValue = "test-identifier";
    const id = `${testUserScope}/${testIdValue}` as RegistryId;

    const { container } = render(<RegistryIdWidget name="testField" />, {
      initialValues: { testField: id },
      setupRedux(dispatch) {
        dispatch(
          authActions.setAuth(
            testFactory.authState({
              scope: testUserScope,
            })
          )
        );
      },
    });

    expect(
      container.querySelector("input[name='testField-scope']")
    ).toHaveValue(testUserScope);
    expect(container.querySelector("input[name='testField-id']")).toHaveValue(
      testIdValue
    );
  });
});
