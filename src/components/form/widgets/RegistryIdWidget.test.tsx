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
import userEvent from "@testing-library/user-event";
import { partition } from "lodash";
import { UserRole } from "@/types/contract";

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

    const scopeInput = container.querySelector("input[name='testField-scope']");
    const idInput = container.querySelector("input[name='testField-id']");

    expect(scopeInput).toHaveValue(testUserScope);
    expect(idInput).toHaveValue(testIdValue);
  });

  test("shows the right organization scopes", async () => {
    const testUserScope = "@userFoo";
    const testIdValue = "test-identifier";
    const id = `${testUserScope}/${testIdValue}` as RegistryId;
    const authState = testFactory.authState({
      scope: testUserScope,
    });

    const editorRoles = new Set<number>([
      UserRole.admin,
      UserRole.developer,
      UserRole.manager,
    ]);
    const [validOrganizations, invalidOrganizations] = partition(
      authState.organizations,
      (organization) => editorRoles.has(organization.role)
    );

    render(<RegistryIdWidget name="testField" />, {
      initialValues: { testField: id },
      setupRedux(dispatch) {
        dispatch(authActions.setAuth(authState));
      },
    });

    const selected = screen.getByText(testUserScope);
    expect(selected).toBeVisible();
    await userEvent.click(selected);

    // Ensure the user scope is shown, should appear twice in selected value and option list item
    expect(screen.getAllByText(testUserScope)).toBeArrayOfSize(2);

    // Ensure all valid options are shown
    for (const organization of validOrganizations) {
      expect(screen.getByText(organization.scope)).toBeVisible();
    }

    // Ensure invalid options are not shown
    for (const organization of invalidOrganizations) {
      expect(screen.queryByText(organization.scope)).toBeNull();
    }
  });
});
