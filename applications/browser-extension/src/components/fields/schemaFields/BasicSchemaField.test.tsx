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

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectToggleMode"] }] -- TODO: replace with native expect and it.each */

import React from "react";
import { render, screen } from "../../../pageEditor/testHelpers";
import BasicSchemaField from "./BasicSchemaField";
import { type Schema } from "../../../types/schemaTypes";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { fireTextInput } from "../../../testUtils/formHelpers";
import { waitForEffect } from "../../../testUtils/testHelpers";
import registerDefaultWidgets from "./widgets/registerDefaultWidgets";
import { type SchemaFieldProps } from "./propTypes";
import { toExpression } from "../../../utils/expressionUtils";

beforeAll(() => {
  registerDefaultWidgets();
});

const renderSchemaField = (
  name: string,
  schema: Schema,
  initialValues: any,
  props?: Partial<SchemaFieldProps>,
) =>
  render(
    <Formik initialValues={initialValues} onSubmit={jest.fn()}>
      <BasicSchemaField name={name} schema={schema} {...props} />
    </Formik>,
  );

describe("option mode switching", () => {
  const expectToggleMode = (container: HTMLElement, mode: string) => {
    expect(
      container.querySelector('[data-testid="toggle-test"]'),
    ).toHaveAttribute("data-test-selected", mode);
  };

  test("switches automatically from variable to text when @ removed - string field", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string" },
      {
        test: toExpression("var", "@data"),
      },
    );

    expectToggleMode(container, "Variable");

    const inputElement = screen.getByLabelText("Test");
    fireTextInput(inputElement, "text");
    await waitForEffect();

    expectToggleMode(container, "Text");
  });

  test("switches from variable when @ removed - enum field", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string", enum: ["option 1", "option 2"] },
      {
        test: toExpression("var", "@data"),
      },
    );

    expectToggleMode(container, "Variable");

    const inputElement = screen.getByLabelText("Test");
    fireTextInput(inputElement, "text");
    await waitForEffect();

    expectToggleMode(container, "Text");
  });

  test("automatically switches to var when @ is typed", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string" },
      {
        test: toExpression("nunjucks", ""),
      },
    );

    expectToggleMode(container, "Text");

    const inputElement = screen.getByLabelText("Test");
    fireTextInput(inputElement, "@data.foo");
    await waitForEffect();

    expectToggleMode(container, "Variable");
  });

  test("automatically wraps vars in braces when typing a space after a var", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string" },
      {
        test: toExpression("var", "@data.foo"),
      },
    );

    expectToggleMode(container, "Variable");

    const inputElement: HTMLInputElement = screen.getByLabelText("Test");
    fireTextInput(inputElement, "@data.foo ");
    await waitForEffect();

    expectToggleMode(container, "Text");
    expect(inputElement.value).toBe("{{@data.foo}} ");
  });
});

test("omit if empty", async () => {
  renderSchemaField(
    "test",
    {
      type: ["string", "number", "boolean"],
    },
    {
      test: toExpression("var", "@data.foo"),
    },
    {
      omitIfEmpty: true,
      label: "testing omit",
    },
  );

  const field = screen.getByLabelText("testing omit");
  expect(screen.getByLabelText("testing omit")).toHaveValue("@data.foo");

  fireTextInput(field, "");
  await waitForEffect();

  expect(screen.getByLabelText("testing omit")).toHaveValue("");

  const fieldToggle = screen.getByTestId("toggle-test");
  expect(fieldToggle).toHaveAttribute("data-test-selected", "Exclude");
});
