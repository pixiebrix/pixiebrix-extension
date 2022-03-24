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
import {
  createFormikTemplate,
  fireTextInput,
  selectSchemaFieldType,
} from "@/utils/testUtils/formHelpers";
import { waitForEffect } from "@/utils/testUtils/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { render, RenderResult, screen } from "@testing-library/react";
import React from "react";
import { act } from "react-dom/test-utils";
import selectEvent from "react-select-event";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import FormBuilder from "./FormBuilder";
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

async function selectUiType(uiType: string) {
  await act(async () =>
    selectEvent.select(screen.getByLabelText("Input Type"), uiType)
  );
}

describe("Dropdown field", () => {
  async function addOption() {
    // Add a text option
    screen.getByText("Add Item").click();
    const firstOption = rendered.container.querySelector(
      `[name="form.schema.properties.${defaultFieldName}.enum.0"]`
    );
    fireTextInput(firstOption, "Test option");
    await waitForEffect();
  }

  async function setVarValue() {
    // Switch to @var and insert "@data"
    await selectSchemaFieldType(
      `form.schema.properties.${defaultFieldName}.enum`,
      "var"
    );
    fireTextInput(screen.getByLabelText("Options"), "@data");
    await waitForEffect();
  }

  let rendered: RenderResult;
  beforeEach(async () => {
    rendered = renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown");
  });

  test("doesn't fail when field type changed to Dropdown", async () => {
    // Expect the dropdown rendered in the preview
    expect(
      rendered.container.querySelector(`select#root_${defaultFieldName}`)
    ).not.toBeNull();
  });

  test("can add an option", async () => {
    await addOption();

    // Expect the dropdown option rendered in the preview
    expect(
      screen.queryByRole("option", { name: "Test option" })
    ).not.toBeNull();
  });

  test("can use @var", async () => {
    await setVarValue();

    // Expect the dropdown option rendered in the preview
    expect(screen.queryByRole("option", { name: "@data" })).not.toBeNull();
  });

  describe("can be switched to Dropdown with labels", () => {
    test("with items", async () => {
      await addOption();

      // Switch to Dropdown widget
      await selectUiType("Dropdown with labels");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement
      ).toHaveTextContent("Dropdown with labels");

      // Expect the dropdown option added in the Editor
      const firstOptionValueInput = rendered.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.const"]`
      );
      // Option value mapped from Dropdown
      expect(firstOptionValueInput).toHaveValue("Test option");

      const firstOptionTitleInput = rendered.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.title"]`
      );
      // Option title is empty
      expect(firstOptionTitleInput).toHaveValue("");

      // Expect the dropdown option rendered in the preview
      expect(
        screen.queryByRole("option", { name: "Test option" })
      ).not.toBeNull();
    });

    test("with @var", async () => {
      await setVarValue();

      // Switch to Dropdown widget
      await selectUiType("Dropdown with labels");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement
      ).toHaveTextContent("Dropdown with labels");

      // Expect the dropdown options is empty
      const firstOptionValueInput = rendered.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.const"]`
      );
      expect(firstOptionValueInput).toBeNull();

      const firstOptionTitleInput = rendered.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.title"]`
      );
      expect(firstOptionTitleInput).toBeNull();
    });
  });
});

describe("Dropdown with labels field", () => {
  async function addOption() {
    // Add a text option
    screen.getByText("Add Item").click();

    // Set option value
    const firstOptionValueInput = rendered.container.querySelector(
      `[name="form.schema.properties.${defaultFieldName}.oneOf.0.const"]`
    );
    fireTextInput(firstOptionValueInput, "1");
    await waitForEffect();

    // Set option label
    const firstOptionLabelInput = rendered.container.querySelector(
      `[name="form.schema.properties.${defaultFieldName}.oneOf.0.title"]`
    );
    fireTextInput(firstOptionLabelInput, "Test option");
    await waitForEffect();
  }

  async function setVarValue() {
    // Switch to @var and inset "@data"
    await selectSchemaFieldType(
      `form.schema.properties.${defaultFieldName}.oneOf`,
      "var"
    );
    fireTextInput(screen.getByLabelText("Options"), "@data");
    await waitForEffect();
  }

  let rendered: RenderResult;
  beforeEach(async () => {
    rendered = renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown with labels");
  });
  test("doesn't fail when field type changed to Dropdown with labels", async () => {
    // Expect the dropdown rendered in the preview
    expect(
      rendered.container.querySelector(`select#root_${defaultFieldName}`)
    ).not.toBeNull();
  });

  test("can add an option", async () => {
    await addOption();

    // Validate the rendered option
    const optionElement = screen.queryByRole("option", { name: "Test option" });
    expect(optionElement).not.toBeNull();
    expect(optionElement).toHaveValue("1");
  });

  test("can use @var in Dropdown", async () => {
    await setVarValue();

    // Expect the dropdown option rendered in the preview
    expect(screen.queryByRole("option", { name: "@data" })).not.toBeNull();
  });

  describe("can be switched to regular Dropdown", () => {
    test("with items", async () => {
      await addOption();

      // Switch to Dropdown widget
      await selectUiType("Dropdown");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement
      ).toHaveTextContent("Dropdown");

      // Expect the dropdown option added in the Editor
      const firstOptionInput = rendered.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.enum.0"]`
      );
      expect(firstOptionInput).toHaveValue("1");

      // Expect the dropdown option rendered in the preview
      expect(screen.queryByRole("option", { name: "1" })).not.toBeNull();
    });

    test("with @var", async () => {
      await setVarValue();

      // Switch to Dropdown widget
      await selectUiType("Dropdown");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement
      ).toHaveTextContent("Dropdown");

      // Expect the dropdown options is empty
      const firstOptionInput = rendered.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.enum.0"]`
      );
      expect(firstOptionInput).toBeNull();
    });
  });
});
