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
import { render, screen } from "@testing-library/react";
import BasicSchemaField from "@/components/fields/schemaFields/BasicSchemaField";
import { Schema } from "@/core";
import { Formik } from "formik";
import { fireTextInput } from "@/tests/formHelpers";
import { waitForEffect } from "@/tests/testHelpers";
import registerDefaultWidgets from "./widgets/registerDefaultWidgets";
import { SchemaFieldProps } from "./propTypes";

beforeAll(() => {
  registerDefaultWidgets();
});

const renderSchemaField = (
  name: string,
  schema: Schema,
  initialValues: any,
  props?: Partial<SchemaFieldProps>
) =>
  render(
    <Formik initialValues={initialValues} onSubmit={jest.fn()}>
      <BasicSchemaField name={name} schema={schema} {...props} />
    </Formik>
  );

describe("option mode switching", () => {
  const expectToggleMode = (container: HTMLElement, mode: string) => {
    expect(
      container.querySelector('[data-testid="toggle-test"]')
    ).toHaveAttribute("data-test-selected", mode);
  };

  test("switches automatically from variable to text when @ removed - string field", async () => {
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

  test("switches automatically from variable to text when @ removed - enum field", async () => {
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

    expectToggleMode(container, "Text");
  });

  test("automatically switches to var when @ is typed", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string" },
      {
        test: {
          __type__: "nunjucks",
          __value__: "",
        },
      }
    );

    expectToggleMode(container, "Text");

    const inputElement = screen.getByLabelText("test");
    fireTextInput(inputElement, "@data.foo");
    await waitForEffect();

    expectToggleMode(container, "Variable");
  });

  test("automatically wraps vars in braces when typing a space after a var", async () => {
    const { container } = renderSchemaField(
      "test",
      { type: "string" },
      {
        test: {
          __type__: "var",
          __value__: "@data.foo",
        },
      }
    );

    expectToggleMode(container, "Variable");

    const inputElement: HTMLInputElement = screen.getByLabelText("test");
    fireTextInput(inputElement, "@data.foo ");
    await waitForEffect();

    expectToggleMode(container, "Text");
    expect(inputElement.value).toStrictEqual("{{@data.foo}} ");
  });
});

test("omit if empty", async () => {
  const rendered = renderSchemaField(
    "test",
    {
      type: ["string", "number", "boolean"],
    },
    {
      test: {
        __type__: "var",
        __value__: "@data.foo",
      },
    },
    {
      omitIfEmpty: true,
      label: "testing omit",
    }
  );

  const field = rendered.getByLabelText("testing omit");
  expect(rendered.getByLabelText("testing omit")).toHaveValue("@data.foo");

  fireTextInput(field, "");
  await waitForEffect();

  expect(rendered.getByLabelText("testing omit")).toHaveValue("");

  const fieldToggle = rendered.getByTestId("toggle-test");
  expect(fieldToggle).toHaveAttribute("data-test-selected", "Exclude");
});
