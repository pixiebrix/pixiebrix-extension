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

import React from "react";
import { render, screen } from "@testing-library/react";
import BasicSchemaField from "@/components/fields/schemaFields/v3/BasicSchemaField";
import { Schema } from "@/core";
import { Formik } from "formik";
import { fireTextInput } from "@/tests/formHelpers";
import { waitForEffect } from "@/tests/testHelpers";

describe("option mode switching", () => {
  const renderSchemaField = (
    name: string,
    schema: Schema,
    initialValues: any
  ) =>
    render(
      <Formik initialValues={initialValues} onSubmit={jest.fn()}>
        <BasicSchemaField name={name} schema={schema} />
      </Formik>
    );

  const expectToggleMode = (container: HTMLElement, mode: string) => {
    expect(
      container.querySelector('[data-testid="toggle-test"]')
    ).toHaveAttribute("data-test-selected", mode);
  };

  test("switches automatically from variable to text when @ removed", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string" },
      {
        test: {
          __type__: "var",
          __value__: "@data",
        },
      }
    );

    expectToggleMode(container, "Variable");

    const inputElement = screen.getByLabelText("test");
    fireTextInput(inputElement, "text");
    await waitForEffect();

    expectToggleMode(container, "Text");
  });

  test("doesn't automatically switch to Text in case of Select field", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string", enum: ["option 1", "option 2"] },
      {
        test: {
          __type__: "var",
          __value__: "@data",
        },
      }
    );

    expectToggleMode(container, "Variable");

    const inputElement = screen.getByLabelText("test");
    fireTextInput(inputElement, "text");
    await waitForEffect();

    expectToggleMode(container, "Variable");
  });
});
