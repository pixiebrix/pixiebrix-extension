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
import SchemaButtonVariantWidget from "@/components/fields/schemaFields/widgets/SchemaButtonVariantWidget";
import { render } from "@/pageEditor/testHelpers";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
// eslint-disable-next-line no-restricted-imports
import { Formik } from "formik";
import selectEvent from "react-select-event";

const fieldName = "testField";
const fieldDescription = "this is a test field description";

const schema: Schema = {
  type: "string",
};

const renderSelect = (value: string, uiSchema: UiSchema = {}) =>
  render(
    <Formik initialValues={{ testField: value }} onSubmit={() => {}}>
      <SchemaButtonVariantWidget
        name={fieldName}
        schema={schema}
        description={fieldDescription}
        uiSchema={uiSchema}
      />
    </Formik>
  );

describe("SchemaButtonVariantWidget", () => {
  test("renders button variant select widget", () => {
    const defaultSelect = renderSelect("outline-primary");

    // General snapshot test
    expect(defaultSelect).toMatchSnapshot();

    // Selected variant matches preview
    const { getByTestId, queryAllByTestId } = defaultSelect;
    expect(getByTestId("selected-variant")).toHaveClass("btn-outline-primary");

    // All variants present
    const selectContainerElement =
      getByTestId("select-container").querySelector("div");
    selectEvent.openMenu(selectContainerElement);
    expect(queryAllByTestId("variant-option")).toHaveLength(18);
  });
});
