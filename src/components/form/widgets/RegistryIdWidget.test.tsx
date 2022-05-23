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
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { render, screen } from "@/testUtils/testHelpers";
import { authActions } from "@/auth/authSlice";
import userEvent from "@testing-library/user-event";
import { partition } from "lodash";
import { UserRole } from "@/types/contract";
import { validateRegistryId } from "@/types/helpers";
import { authStateFactory } from "@/testUtils/factories";

const editorRoles = new Set<number>([
  UserRole.admin,
  UserRole.developer,
  UserRole.manager,
]);

describe("RegistryIdWidget", () => {
  const testUserScope = "@user-foo";
  const testIdValue = "test-identifier";

  test("renders with user id value", async () => {
    const id = validateRegistryId(`${testUserScope}/${testIdValue}`);

    const { container } = render(<RegistryIdWidget name="testField" />, {
      initialValues: { testField: id },
      setupRedux(dispatch) {
        dispatch(
          authActions.setAuth(
            authStateFactory({
              scope: testUserScope,
            })
          )
        );
      },
    });

    const scopeInput = container.querySelector("input[name='testField-scope']");
    const idInput = screen.getByTestId("registryId-testField-id");

    expect(scopeInput).toHaveValue(testUserScope);
    expect(idInput).toHaveValue(testIdValue);
  });

  test("shows the right organization scopes", async () => {
    const id = validateRegistryId(`${testUserScope}/${testIdValue}`);
    const authState = authStateFactory({
      scope: testUserScope,
    });

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

  test("sets the id properly", async () => {
    const id = validateRegistryId(`${testUserScope}/${testIdValue}`);
    const authState = authStateFactory({
      scope: testUserScope,
    });

    const anotherOrganization = authState.organizations.find(
      (organization: { id: string; role: number }) =>
        organization.id !== authState.organization.id &&
        editorRoles.has(organization.role)
    );

    const { getFormState } = render(<RegistryIdWidget name="testField" />, {
      initialValues: { testField: id },
      setupRedux(dispatch) {
        dispatch(authActions.setAuth(authState));
      },
    });

    const selected = screen.getByText(testUserScope);
    expect(selected).toBeVisible();
    await userEvent.click(selected);

    await userEvent.click(screen.getByText(anotherOrganization.scope));

    const newTestId = "new-identifier";
    const idInput = screen.getByTestId("registryId-testField-id");

    await userEvent.clear(idInput);
    await userEvent.type(idInput, newTestId);

    const formState = await getFormState();
    expect(formState).toStrictEqual({
      testField: `${anotherOrganization.scope}/${newTestId}`,
    });
  });
});
