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

/* eslint-disable testing-library/no-node-access -- TODO: refactor to use better locator methods */
import { getExampleBrickConfig } from "@/bricks/exampleBrickConfigs";
import {
  createFormikTemplate,
  fireTextInput,
  RJSF_SCHEMA_PROPERTY_NAME,
  selectSchemaFieldInputMode,
} from "@/testUtils/formHelpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { render, type RenderResult, screen } from "@/pageEditor/testHelpers";
import React from "react";
import { act } from "react-dom/test-utils";
import selectEvent from "react-select-event";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import FormBuilder from "./FormBuilder";
import { type RJSFSchema } from "../formBuilderTypes";
import userEvent from "@testing-library/user-event";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { type Schema, type UiSchema } from "@/types/schemaTypes";

let exampleFormSchema: RJSFSchema;
let defaultFieldName: string;

beforeAll(() => {
  registerDefaultWidgets();
  const { schema, uiSchema } = getExampleBrickConfig(
    CustomFormRenderer.BRICK_ID,
  )!;
  exampleFormSchema = {
    schema: schema as Schema,
    uiSchema: uiSchema as UiSchema,
  };
  defaultFieldName = "notes";
});

function renderFormBuilder(
  formBuilderSchema: RJSFSchema = exampleFormSchema,
  activeField = defaultFieldName,
) {
  const initialValues = {
    form: formBuilderSchema,
  };
  const FormikTemplate = createFormikTemplate(initialValues);
  return render(
    <FormikTemplate>
      <FormBuilder name="form" initialActiveField={activeField} />
    </FormikTemplate>,
  );
}

async function selectUiType(uiType: string) {
  await act(async () =>
    selectEvent.select(screen.getByLabelText("Input Type"), uiType),
  );
}

async function renameField(newName: string) {
  const fieldNameInput = screen.getByLabelText("Name");
  fireTextInput(fieldNameInput, newName);
  await waitForEffect();
}

/**
 * Utility function to get react-select option labels
 */
function getAllReactSelectOptionLabels(
  reactSelectContainer: HTMLElement,
): string[] {
  const reactSelectOptionQueryString = '[id^="react-select-"][id*="-option-"]';

  const options = [];

  for (const item of reactSelectContainer.querySelectorAll(
    reactSelectOptionQueryString,
  )) {
    options.push(item.textContent);
  }

  return options;
}

/**
 * React-select does not allow let you pass testids through
 * and the id is duplicate at the time of writing this, so we use
 * a wrapper with the testid and get the first div as the container.
 */
const getReactSelectContainer = (): HTMLElement =>
  screen.getByTestId("formbuilder-select-wrapper").querySelector("div")!;

describe("Dropdown field", () => {
  async function addOption() {
    // Add a text option
    screen.getByText("Add Item").click();

    fireTextInput(screen.getByRole("textbox", { name: "" }), "Test option");
    await waitForEffect();
  }

  async function setVarValue() {
    // Switch to @var and insert "@data"
    await selectSchemaFieldInputMode(
      `form.schema.properties.${defaultFieldName}.enum`,
      "var",
    );
    fireTextInput(screen.getByLabelText("Options"), "@data");
    await waitForEffect();
  }

  test("doesn't fail when field type changed to Dropdown", async () => {
    renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown");

    // Expect the dropdown rendered in the preview
    expect(getReactSelectContainer()).not.toBeNull();
  });

  test("can add an option", async () => {
    renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown");

    const selectContainer = getReactSelectContainer();
    selectEvent.openMenu(selectContainer);

    // Ensure no existing options first
    expect(getAllReactSelectOptionLabels(selectContainer)).toBeArrayOfSize(0);

    // Add option
    await addOption();

    // Ensure new option's added
    expect(getAllReactSelectOptionLabels(selectContainer)).toContain(
      "Test option",
    );
  });

  test("can use @var", async () => {
    renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown");

    const container = getReactSelectContainer();
    selectEvent.openMenu(container);

    await setVarValue();
    expect(getAllReactSelectOptionLabels(container)).toContain("@data");
  });

  describe("can be switched to Dropdown with labels", () => {
    test("with items", async () => {
      const utils = renderFormBuilder();

      // Switch to Dropdown widget
      await selectUiType("Dropdown");

      const selectContainer = getReactSelectContainer();
      selectEvent.openMenu(selectContainer);

      await addOption();

      // Switch to Dropdown widget
      await selectUiType("Dropdown with labels");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement,
      ).toHaveTextContent("Dropdown with labels");

      // Expect the dropdown option added in the Editor
      // eslint-disable-next-line testing-library/no-container -- TODO: find better query
      const firstOptionValueInput = utils.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.const"]`,
      );
      // Option value mapped from Dropdown
      expect(firstOptionValueInput).toHaveValue("Test option");

      // eslint-disable-next-line testing-library/no-container -- TODO: find better query
      const firstOptionTitleInput = utils.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.title"]`,
      );
      // Option title is empty
      expect(firstOptionTitleInput).toHaveValue("");

      // Expect the dropdown option rendered in the preview
      expect(getAllReactSelectOptionLabels(selectContainer)).toContain(
        "Test option",
      );
    });

    test("with @var", async () => {
      const utils = renderFormBuilder();

      // Switch to Dropdown widget
      await selectUiType("Dropdown");

      await setVarValue();

      // Switch to Dropdown widget
      await selectUiType("Dropdown with labels");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement,
      ).toHaveTextContent("Dropdown with labels");

      // Expect the dropdown options is empty
      // eslint-disable-next-line testing-library/no-container -- TODO: find better query
      const firstOptionValueInput = utils.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.const"]`,
      );
      expect(firstOptionValueInput).toBeNull();

      // eslint-disable-next-line testing-library/no-container -- TODO: find better query
      const firstOptionTitleInput = utils.container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.oneOf.0.title"]`,
      );
      expect(firstOptionTitleInput).toBeNull();
    });
  });
});

describe("Dropdown with labels field", () => {
  async function addOption(container: RenderResult["container"]) {
    // Add a text option
    screen.getByText("Add Item").click();

    // Set option value
    const firstOptionValueInput = container.querySelector(
      `[name="form.schema.properties.${defaultFieldName}.oneOf.0.const"]`,
    )!;

    fireTextInput(firstOptionValueInput, "1");
    await waitForEffect();

    // Set option label
    const firstOptionLabelInput = container.querySelector(
      `[name="form.schema.properties.${defaultFieldName}.oneOf.0.title"]`,
    )!;
    fireTextInput(firstOptionLabelInput, "Test option");
    await waitForEffect();
  }

  async function setVarValue() {
    // Switch to @var and inset "@data"
    await selectSchemaFieldInputMode(
      `form.schema.properties.${defaultFieldName}.oneOf`,
      "var",
    );
    fireTextInput(screen.getByLabelText("Options"), "@data");
    await waitForEffect();
  }

  test("doesn't fail when field type changed to Dropdown with labels", async () => {
    renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown with labels");

    // Expect the dropdown rendered in the preview
    expect(getReactSelectContainer()).not.toBeNull();
  });

  test("can add an option", async () => {
    const { container } = renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown with labels");

    const selectContainer = getReactSelectContainer();
    selectEvent.openMenu(selectContainer);
    await addOption(container);

    // Validate the rendered option
    expect(getAllReactSelectOptionLabels(selectContainer)).toContain(
      "Test option",
    );
  });

  test("can use @var in Dropdown", async () => {
    renderFormBuilder();

    // Switch to Dropdown widget
    await selectUiType("Dropdown with labels");

    const selectContainer = getReactSelectContainer();
    selectEvent.openMenu(selectContainer);

    await setVarValue();

    // Expect the dropdown option rendered in the preview
    expect(getAllReactSelectOptionLabels(selectContainer)).toContain("@data");
  });

  describe("can be switched to regular Dropdown", () => {
    test("with items", async () => {
      const { container } = renderFormBuilder();

      // Switch to Dropdown widget
      await selectUiType("Dropdown with labels");

      const selectContainer = getReactSelectContainer();
      selectEvent.openMenu(selectContainer);

      await addOption(container);

      // Switch to Dropdown widget
      await selectUiType("Dropdown");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement,
      ).toHaveTextContent("Dropdown");

      // Expect the dropdown option added in the Editor
      // eslint-disable-next-line testing-library/no-container -- TODO: find better query
      const firstOptionInput = container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.enum.0"]`,
      );
      expect(firstOptionInput).toHaveValue("1");

      // Expect the dropdown option rendered in the preview
      expect(getAllReactSelectOptionLabels(selectContainer)).toContain("1");
    });

    test("with @var", async () => {
      const { container } = renderFormBuilder();

      // Switch to Dropdown widget
      await selectUiType("Dropdown with labels");

      await setVarValue();

      // Switch to Dropdown widget
      await selectUiType("Dropdown");

      // Expect the ui type has changed
      expect(
        screen.queryByLabelText("Input Type")?.parentElement?.parentElement,
      ).toHaveTextContent("Dropdown");

      // Expect the dropdown options is empty
      // eslint-disable-next-line testing-library/no-container -- TODO: find better query
      const firstOptionInput = container.querySelector(
        `[name="form.schema.properties.${defaultFieldName}.enum.0"]`,
      );
      expect(firstOptionInput).toBeNull();
    });
  });
});

describe("rename a field", () => {
  test("can add and rename a text field", async () => {
    const FormikTemplate = createFormikTemplate(
      {
        [RJSF_SCHEMA_PROPERTY_NAME]: {},
      },
      jest.fn(),
    );

    const { container } = render(
      <FormikTemplate>
        <FormBuilder name={RJSF_SCHEMA_PROPERTY_NAME} />
      </FormikTemplate>,
    );

    // Add a field
    await userEvent.click(
      screen.getByRole("button", {
        name: /add new field/i,
      }),
    );

    const newFieldName = "test";
    await renameField(newFieldName);

    // eslint-disable-next-line testing-library/no-container -- TODO: refactor to use better locator methods
    const previewInput = container.querySelector(`#root_${newFieldName}`);

    expect(previewInput).toBeInTheDocument();
  });

  test("can add and rename date field", async () => {
    const FormikTemplate = createFormikTemplate({
      [RJSF_SCHEMA_PROPERTY_NAME]: {},
    });

    const { container } = render(
      <FormikTemplate>
        <FormBuilder name={RJSF_SCHEMA_PROPERTY_NAME} />
      </FormikTemplate>,
    );

    // Add a field
    await userEvent.click(
      screen.getByRole("button", {
        name: /add new field/i,
      }),
    );

    await selectUiType("Date");

    const newFieldName = "test";
    await renameField(newFieldName);

    // eslint-disable-next-line testing-library/no-container -- TODO: refactor to use better locator methods
    const previewInput = container.querySelector(`#root_${newFieldName}`);

    expect(previewInput).toBeInTheDocument();
  });

  test("can rename a field with example block config", async () => {
    const FormikTemplate = createFormikTemplate(
      {
        [RJSF_SCHEMA_PROPERTY_NAME]: getExampleBrickConfig(
          CustomFormRenderer.BRICK_ID,
        ),
      },
      jest.fn(),
    );

    const { container } = render(
      <FormikTemplate>
        <FormBuilder name={RJSF_SCHEMA_PROPERTY_NAME} />
      </FormikTemplate>,
    );

    const newFieldName = "test";
    await renameField(newFieldName);

    // eslint-disable-next-line testing-library/no-container -- TODO: refactor to use better locator methods
    const previewInput = container.querySelector(`#root_${newFieldName}`);

    expect(previewInput).toBeInTheDocument();
  });

  it("does not show google sheet input type option", async () => {
    const FormikTemplate = createFormikTemplate(
      {
        [RJSF_SCHEMA_PROPERTY_NAME]: getExampleBrickConfig(
          CustomFormRenderer.BRICK_ID,
        ),
      },
      jest.fn(),
    );

    render(
      <FormikTemplate>
        <FormBuilder name={RJSF_SCHEMA_PROPERTY_NAME} />
      </FormikTemplate>,
    );
    await waitForEffect();

    const inputTypeSelect = screen.getByLabelText("Input Type");
    selectEvent.openMenu(inputTypeSelect);
    expect(screen.queryByText("Google Sheet")).not.toBeInTheDocument();
  });
});
