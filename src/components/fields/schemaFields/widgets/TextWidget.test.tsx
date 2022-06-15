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
import { render, screen } from "@/pageEditor/testHelpers";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import userEvent from "@testing-library/user-event";
import { stringToExpression } from "@/pageEditor/extensionPoints/upgrade";

const fieldName = "testField";
const fieldDescription = "this is a test field description";

jest.setTimeout(100000);

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

  // eslint-disable-next-line jest/no-commented-out-tests -- TODO: Fix this test
  // test("can undo value changes", async () => {
  //   const schema: Schema = {
  //     type: "string",
  //     description: fieldDescription,
  //   };
  //   const { getFormState } = render(<TextWidget name={fieldName} schema={schema} isRequired />, {
  //     initialValues: {
  //       [fieldName]: stringToExpression("", "nunjucks"),
  //     },
  //   });
  //
  //   await userEvent.type(screen.getByRole("textbox"), "abc");
  //   await userEvent.type(screen.getByRole("textbox"), " def");
  //   await userEvent.type(screen.getByRole("textbox"), " ghi");
  //
  //   await userEvent.keyboard("{Meta>}{z}{/Meta}");
  //
  //   const formState = await getFormState();
  //
  //   expect(formState).toStrictEqual({
  //     [fieldName]: stringToExpression("abc def", "nunjucks")
  //   });
  // });
});
