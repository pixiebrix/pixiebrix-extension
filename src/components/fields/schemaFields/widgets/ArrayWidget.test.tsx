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
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { Schema } from "@/core";
import { render, screen } from "@/testUtils/testHelpers";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import userEvent from "@testing-library/user-event";
import { stringToExpression } from "@/pageEditor/extensionPoints/upgrade";

jest.unmock("react-redux");

const fieldName = "testField";
const fieldDescription = "this is a test field description";

describe("ArrayWidget", () => {
  beforeAll(() => {
    registerDefaultWidgets();
  });

  test("renders empty widget", () => {
    const schema: Schema = {
      type: "array",
      additionalItems: true,
    };
    expect(
      render(
        <ArrayWidget
          name={fieldName}
          schema={schema}
          isRequired
          description={fieldDescription}
          defaultType="array"
        />,
        {
          initialValues: {
            [fieldName]: [],
          },
        }
      ).asFragment()
    ).toMatchSnapshot();
  });

  test("renders widget with items", () => {
    const schema: Schema = {
      type: "array",
      additionalItems: true,
      items: {
        type: "string",
      },
    };
    expect(
      render(
        <ArrayWidget
          name={fieldName}
          schema={schema}
          isRequired
          description={fieldDescription}
          defaultType="array"
        />,
        {
          initialValues: {
            [fieldName]: [
              "abc",
              "def",
              "this is a really long string to see what happens when the array value is long",
            ],
          },
        }
      ).asFragment()
    ).toMatchSnapshot();
  });

  test("add item", async () => {
    const schema: Schema = {
      type: "array",
      additionalItems: true,
    };
    const { getFormState } = render(
      <ArrayWidget
        name={fieldName}
        schema={schema}
        isRequired
        description={fieldDescription}
        defaultType="array"
      />,
      {
        initialValues: {
          [fieldName]: [],
        },
      }
    );

    // Add an item
    await userEvent.click(screen.getByText(/add item/i));

    const itemInput = screen.getByRole("textbox");

    // Change the item value
    await userEvent.type(itemInput, "myValue");

    const formState = await getFormState();

    expect(formState).toStrictEqual({
      [fieldName]: [stringToExpression("myValue", "nunjucks")],
    });
  });

  test("remove item", async () => {
    const schema: Schema = {
      type: "array",
      additionalItems: true,
      items: {
        type: "string",
      },
    };
    const { getFormState } = render(
      <ArrayWidget
        name={fieldName}
        schema={schema}
        isRequired
        description={fieldDescription}
        defaultType="array"
      />,
      {
        initialValues: {
          [fieldName]: ["abc", "def"],
        },
      }
    );

    // Open the field type toggle
    await userEvent.click(
      screen.getByTestId(`toggle-${fieldName}.1`).querySelector("button")
    );

    // Select "Remove" since we're in an array
    await userEvent.click(screen.getByText("Remove"));

    const formState = await getFormState();

    // Expect excluded property to be removed from the state
    expect(formState).toStrictEqual({
      [fieldName]: ["abc"],
    });
  });
});
