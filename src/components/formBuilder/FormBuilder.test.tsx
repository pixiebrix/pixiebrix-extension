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

import { IBlock } from "@/core";
import { getExampleBlockConfig } from "@/pageEditor/tabs/editTab/exampleBlockConfigs";
import { createFormikTemplate, fireTextInput } from "@/tests/formHelpers";
import { waitForEffect } from "@/tests/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { render, screen } from "@testing-library/react";
import React from "react";
import { act } from "react-dom/test-utils";
import selectEvent from "react-select-event";
import registerDefaultWidgets from "../fields/schemaFields/widgets/registerDefaultWidgets";
import Form from "../form/Form";
import FormBuilder from "./FormBuilder";
import { MINIMAL_SCHEMA, MINIMAL_UI_SCHEMA } from "./formBuilderHelpers";
import { RJSFSchema } from "./formBuilderTypes";

let exampleFormSchema: RJSFSchema;
let defaultFieldName: string;

beforeAll(() => {
  registerDefaultWidgets();
  const { schema, uiSchema } = getExampleBlockConfig({
    id: validateRegistryId("@pixiebrix/form"),
  } as IBlock);
  exampleFormSchema = {
    schema,
    uiSchema,
  };
  defaultFieldName = "notes";
});

function renderFormBuilder(
  formBuilderSchema: RJSFSchema = exampleFormSchema,
  activeField = defaultFieldName
) {
  const initialValues = {
    form: formBuilderSchema,
  };
  const FormikTemplate = createFormikTemplate(initialValues);
  return render(
    <FormikTemplate>
      <FormBuilder name="form" initialActiveField={activeField} />
    </FormikTemplate>
  );
}

describe("Dropdown field", () => {
  async function selectUiType(uiType: string) {
    await act(async () =>
      selectEvent.select(screen.getByLabelText("Input Type"), uiType)
    );
  }

  test("doesn't fail when field type changed to Dropdown", async () => {
    const rendered = renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown");

    // Expect the dropdown rendered in the preview
    expect(
      rendered.container.querySelector(`select#root_${defaultFieldName}`)
    ).not.toBeNull();
  });

  test("can add an option to Dropdown", async () => {
    const rendered = renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown");

    // Add a text option
    screen.getByText("Add Item").click();
    const firstOption = rendered.container.querySelector(
      `[name="form.schema.properties.${defaultFieldName}.enum.0"]`
    );
    fireTextInput(firstOption, "Test option");
    await waitForEffect();

    // Expect the dropdown option rendered in the preview
    expect(
      screen.queryByRole("option", { name: "Test option" })
    ).not.toBeNull();
  });
});
