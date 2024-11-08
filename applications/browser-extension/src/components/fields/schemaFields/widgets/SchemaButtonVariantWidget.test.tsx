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

import React from "react";
import SchemaButtonVariantWidget from "./SchemaButtonVariantWidget";
import { render, screen } from "../../../../pageEditor/testHelpers";
import { type Schema } from "../../../../types/schemaTypes";
// eslint-disable-next-line no-restricted-imports -- Required for testing
import { Formik } from "formik";
import selectEvent from "react-select-event";
import userEvent from "@testing-library/user-event";
import { noop } from "lodash";

const fieldName = "testField";
const fieldDescription = "this is a test field description";

const schema: Schema = {
  type: "string",
  oneOf: [
    { const: "primary", title: "Primary" },
    { const: "outline-primary", title: "Primary" },
    { const: "secondary", title: "Secondary" },
    { const: "outline-secondary", title: "Secondary" },
    { const: "success", title: "Success" },
    { const: "outline-success", title: "Success" },
    { const: "warning", title: "Warning" },
    { const: "outline-warning", title: "Warning" },
    { const: "danger", title: "Danger" },
    { const: "outline-danger", title: "Danger" },
  ],
};

const renderSelect = (
  value: string,
  onSubmit: (formVals: any) => void = noop,
) =>
  render(
    <Formik
      initialValues={{ testField: value }}
      onSubmit={onSubmit}
      validate={onSubmit}
      validateOnChange
    >
      <SchemaButtonVariantWidget
        name={fieldName}
        schema={schema}
        description={fieldDescription}
      />
    </Formik>,
  );

describe("SchemaButtonVariantWidget", () => {
  test("renders button variant select widget", () => {
    const { asFragment } = renderSelect("outline-primary");

    // General snapshot test
    expect(asFragment()).toMatchSnapshot();

    // Selected variant matches preview
    expect(screen.getByTestId("selected-variant")).toHaveClass(
      "btn-outline-primary",
    );
  });

  test("selecting variants updates form", async () => {
    const onSubmit = jest.fn();

    renderSelect("outline-primary", (values) => onSubmit(values));

    // All variants present
    selectEvent.openMenu(screen.getByRole("combobox"));
    const options = screen.getAllByTestId("variant-option");
    expect(options).toHaveLength(10);

    await userEvent.click(options[4]!);

    expect(screen.getByTestId("selected-variant")).toHaveClass("btn-success");
    expect(onSubmit).toHaveBeenCalledWith({ testField: "success" });
  });
});
