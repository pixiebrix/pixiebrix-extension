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

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectToggleOptions"] }] -- TODO: replace with native expect and it.each */

import React from "react";
import { type Schema } from "@/types/schemaTypes";
import { render, screen, within } from "@/pageEditor/testHelpers";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import userEvent from "@testing-library/user-event";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { expectToggleOptions } from "@/components/fields/schemaFields/testHelpers";
import { toExpression } from "@/utils/expressionUtils";

const fieldName = "testField";
const fieldDescription = "this is a test field description";

describe("ObjectWidget", () => {
  beforeAll(() => {
    registerDefaultWidgets();
  });

  test("renders empty widget", () => {
    const schema: Schema = {
      type: "object",
      additionalProperties: true,
    };
    expect(
      render(<ObjectWidget name={fieldName} schema={schema} />, {
        initialValues: {
          [fieldName]: {},
        },
      }).asFragment(),
    ).toMatchSnapshot();
  });

  test("renders widget with properties", () => {
    const schema: Schema = {
      type: "object",
      properties: {
        foo: {
          type: "number",
          default: 42,
        },
        bar: {
          type: "string",
        },
        baz: {
          oneOf: [
            {
              type: "boolean",
            },
            {
              type: "number",
            },
            {
              type: "string",
            },
          ],
        },
      },
    };
    expect(
      render(<ObjectWidget name={fieldName} schema={schema} />, {
        initialValues: {
          [fieldName]: {},
        },
      }).asFragment(),
    ).toMatchSnapshot();
  });

  test("add property and change value", async () => {
    const schema: Schema = {
      type: "object",
      additionalProperties: true,
    };
    const { getFormState } = render(
      <ObjectWidget
        name={fieldName}
        schema={schema}
        isRequired
        description={fieldDescription}
        defaultType="object"
      />,
      {
        initialValues: {
          [fieldName]: {},
        },
      },
    );

    // Add a property
    await userEvent.click(screen.getByText(/add property/i));

    const [nameInput, valueInput] = screen.getAllByRole("textbox");

    // Change the property name
    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, "myProp");

    // Change the value
    await userEvent.click(valueInput!);
    await userEvent.type(screen.getAllByRole("textbox")[1]!, "myValue");

    // Blur the value input to set the value
    await userEvent.click(nameInput!);

    expect(getFormState()).toStrictEqual({
      [fieldName]: {
        myProp: toExpression("nunjucks", "myValue"),
      },
    });
  });

  test("remove property", async () => {
    const schema: Schema = {
      type: "object",
      additionalProperties: {
        type: "string",
      },
    };
    const { getFormState } = render(
      <ObjectWidget
        name={fieldName}
        schema={schema}
        isRequired
        description={fieldDescription}
        defaultType="object"
      />,
      {
        initialValues: {
          [fieldName]: {
            foo: "bar",
            myField: "myValue",
          },
        },
      },
    );

    // Open the field type toggle
    await userEvent.click(
      within(screen.getByTestId(`toggle-${fieldName}.myField`)).getByRole(
        "button",
      ),
    );

    // Select "Exclude"
    await userEvent.click(screen.getByText("Exclude"));

    // Expect excluded property to be removed from the state
    expect(getFormState()).toStrictEqual({
      [fieldName]: {
        foo: "bar",
      },
    });
  });

  test("defined property removed from state and not ui", async () => {
    const schema: Schema = {
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
        bar: {
          type: "string",
        },
      },
    };
    const { getFormState } = render(
      <ObjectWidget
        name={fieldName}
        schema={schema}
        isRequired
        description={fieldDescription}
        defaultType="object"
      />,
      {
        initialValues: {
          [fieldName]: {
            foo: "fooValue",
            bar: "barValue",
          },
        },
      },
    );

    // Open the field type toggle
    await userEvent.click(
      within(screen.getByTestId(`toggle-${fieldName}.bar`)).getByRole("button"),
    );

    // Select "Exclude"
    await userEvent.click(screen.getByText("Exclude"));

    // Expect excluded property to be removed from the state
    expect(getFormState()).toStrictEqual({
      [fieldName]: {
        foo: "fooValue",
      },
    });

    // Expect defined property that was "removed" to remain in the ui
    expect(screen.getByDisplayValue("bar")).toBeVisible();
  });

  test("required property can't be removed", async () => {
    const schema: Schema = {
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
        bar: {
          type: "string",
        },
      },
      required: ["foo"],
    };
    render(
      <ObjectWidget
        name={fieldName}
        schema={schema}
        isRequired
        description={fieldDescription}
        defaultType="object"
      />,
      {
        initialValues: {
          [fieldName]: {
            foo: "fooValue",
            bar: "barValue",
          },
        },
      },
    );

    // Find the field type toggles
    const fooToggle = within(
      screen.getByTestId(`toggle-${fieldName}.foo`),
    ).getByRole("button");
    const barToggle = within(
      screen.getByTestId(`toggle-${fieldName}.bar`),
    ).getByRole("button");

    // Open foo's field type toggle
    await userEvent.click(fooToggle);

    // Expect not to find "Exclude" for a required field
    await expectToggleOptions("toggle-testField.foo", ["string", "var"]);

    // Close foo's toggle
    await userEvent.click(fooToggle);

    // Open bar's field type toggle
    await userEvent.click(barToggle);

    // Expect to find the "Exclude" (omit) option
    await expectToggleOptions("toggle-testField.bar", [
      "string",
      "var",
      "omit",
    ]);
  });
});
