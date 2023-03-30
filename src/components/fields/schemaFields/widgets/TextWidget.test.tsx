/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type Schema } from "@/core";
import { render, screen } from "@/pageEditor/testHelpers";
import TextWidget, {
  isVarValue,
} from "@/components/fields/schemaFields/widgets/TextWidget";
import userEvent from "@testing-library/user-event";
import { stringToExpression } from "@/pageEditor/extensionPoints/upgrade";

const fieldName = "testField";
const fieldDescription = "this is a test field description";

describe("TextWidget", () => {
  beforeAll(() => {
    registerDefaultWidgets();
  });

  test("renders empty widget", async () => {
    const schema: Schema = {
      type: "string",
      description: fieldDescription,
    };
    expect(
      render(
        <TextWidget name={fieldName} schema={schema} defaultType="string" />,
        {
          initialValues: {
            [fieldName]: "",
          },
        }
      ).asFragment()
    ).toMatchSnapshot();
  });

  test("changes value", async () => {
    const schema: Schema = {
      type: "string",
      description: fieldDescription,
    };
    const { getFormState } = render(
      <TextWidget name={fieldName} schema={schema} isRequired />,
      {
        initialValues: {
          [fieldName]: stringToExpression("", "nunjucks"),
        },
      }
    );

    await userEvent.type(screen.getByRole("textbox"), "abc");

    const formState = await getFormState();

    expect(formState).toStrictEqual({
      [fieldName]: stringToExpression("abc", "nunjucks"),
    });
  });

  test("isVarValue()", () => {
    // Valid strings:
    expect(isVarValue("@object")).toBe(true);
    expect(isVarValue("@object.property")).toBe(true);
    expect(isVarValue("@myObject.property")).toBe(true);
    expect(isVarValue("@example['property']")).toBe(true);
    expect(isVarValue('@example["property"]')).toBe(true);
    expect(isVarValue('@example["spaced property name"]')).toBe(true);
    expect(isVarValue('@example.property["nestedProperty"]')).toBe(true);
    expect(isVarValue('@example.property["nested spaced property"]')).toBe(
      true
    );
    expect(isVarValue("@example.property['nestedProperty']")).toBe(true);
    expect(isVarValue('@example["property"].nestedProperty')).toBe(true);
    expect(isVarValue("@example.property.nestedProperty")).toBe(true);

    // Invalid strings:
    expect(isVarValue("abc")).toBe(false);
    expect(isVarValue("@property extra text")).toBe(false);
    expect(isVarValue("@123")).toBe(false);
    expect(isVarValue("@")).toBe(false);
  });
});
