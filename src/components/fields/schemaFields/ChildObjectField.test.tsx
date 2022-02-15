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

import { Schema } from "@/core";
import { render, screen } from "@testing-library/react";
import { Formik } from "formik";
import React from "react";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import { expectToggleOptions } from "@/components/fields/schemaFields/fieldTestUtils";

describe("ChildObjectField", () => {
  const renderField = (name: string, schema: Schema, initialValues: any) =>
    render(
      <Formik initialValues={initialValues} onSubmit={jest.fn()}>
        <ChildObjectField name="data" schema={schema} heading="Test Field" />
      </Formik>
    );

  const expectToggleMode = (
    container: HTMLElement,
    toggleTestId: string,
    mode: string
  ) => {
    expect(
      container.querySelector(`[data-testid="${toggleTestId}"]`)
    ).not.toBeNull();

    expect(
      container.querySelector(`[data-testid="${toggleTestId}"]`)
    ).toHaveAttribute("data-test-selected", mode);
  };

  test("renders object schema", async () => {
    const { container } = renderField(
      "test",
      {
        type: "object",
        properties: {
          InputValue: { type: "string", description: "A string input value" },
        },
      },
      {}
    );

    screen.debug();

    // Starts as Exclude because it's not required
    expectToggleMode(container, "toggle-data.InputValue", "Exclude");
    await expectToggleOptions(container, ["string", "var", "omit"]);
  });
});
