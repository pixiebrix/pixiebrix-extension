/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Schema, UiSchema } from "@/core";
import { waitForEffect } from "@/tests/testHelpers";
import testItRenders, { ItRendersOptions } from "@/tests/testItRenders";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { Except } from "type-fest";
import { MINIMAL_SCHEMA, MINIMAL_UI_SCHEMA } from "./formBuilderHelpers";
import {
  createFormikTemplate,
  RJSF_SCHEMA_PROPERTY_NAME,
} from "./formBuilderTestHelpers";
import { RJSFSchema } from "./formBuilderTypes";
import FormEditor, { FormEditorProps } from "./FormEditor";

describe("FormEditor", () => {
  const defaultProps: Except<FormEditorProps, "activeField"> = {
    name: RJSF_SCHEMA_PROPERTY_NAME,
    setActiveField: jest.fn(),
  };

  describe("renders", () => {
    testItRenders({
      testName: "empty schema",
      Component: FormEditor,
      props: defaultProps,
      TemplateComponent: createFormikTemplate({} as RJSFSchema),
      isAsync: true,
    });

    testItRenders(() => {
      const schema: Schema = {
        title: "A form",
        description: "A form example.",
        type: "object",
        properties: {
          firstName: {
            type: "string",
            title: "First name",
            default: "Chuck",
          },
          age: {
            type: "number",
            title: "Age",
          },
          telephone: {
            type: "string",
            title: "Telephone",
          },
        },
      };
      const uiSchema: UiSchema = {};

      const props: FormEditorProps = {
        ...defaultProps,
        activeField: "firstName",
      };

      const options: ItRendersOptions<FormEditorProps> = {
        testName: "simple schema",
        Component: FormEditor,
        props,
        TemplateComponent: createFormikTemplate({
          schema,
          uiSchema,
        } as RJSFSchema),
        isAsync: true,
      };

      return options;
    });
  });

  test("doesn't mark name field as invalid on blur", async () => {
    const fieldName = "firstName";
    const activeFieldTitle = "First name";

    const schema: Schema = {
      title: "A form",
      type: "object",
      properties: {
        [fieldName]: {
          type: "string",
          title: activeFieldTitle,
          default: "Chuck",
        },
      },
    };
    const FormikTemplate = createFormikTemplate({
      schema,
      uiSchema: {},
    } as RJSFSchema);

    render(
      <FormikTemplate>
        <FormEditor activeField={fieldName} {...defaultProps} />
      </FormikTemplate>
    );

    await waitForEffect();

    const fieldNameInput = screen.getByLabelText("Name");
    fireEvent.focus(fieldNameInput);
    fireEvent.blur(fieldNameInput);

    await waitForEffect();

    const errorMessage = screen.queryByText(
      `Name must be unique. Another property "${activeFieldTitle}" already has the name "${fieldName}".`
    );
    expect(errorMessage).toBeNull();

    // Ensure the field is still active
    expect(screen.getByLabelText("Name")).not.toBeNull();
  });

  test("validates the field name is unique", async () => {
    const fieldName = "firstName";
    const anotherFieldName = "lastName";
    const anotherFieldTitle = "Another field";

    const schema: Schema = {
      title: "A form",
      type: "object",
      properties: {
        [fieldName]: {
          type: "string",
          title: "First name",
        },
        [anotherFieldName]: {
          type: "string",
          title: anotherFieldTitle,
        },
      },
    };
    const FormikTemplate = createFormikTemplate({
      schema,
      uiSchema: {},
    } as RJSFSchema);

    render(
      <FormikTemplate>
        <FormEditor activeField={fieldName} {...defaultProps} />
      </FormikTemplate>
    );

    await waitForEffect();

    const fieldNameInput = screen.getByLabelText("Name");
    fireEvent.focus(fieldNameInput);
    fireEvent.change(fieldNameInput, { target: { value: anotherFieldName } });
    fireEvent.blur(fieldNameInput);

    const errorMessage = screen.getByText(
      `Name must be unique. Another property "${anotherFieldTitle}" already has the name "${anotherFieldName}".`
    );
    expect(errorMessage).not.toBeNull();

    // Ensure the field is still active
    expect(screen.getByLabelText("Name")).not.toBeNull();
  });

  test("can add field", async () => {
    const onSubmitMock = jest.fn();

    const FormikTemplate = createFormikTemplate(
      {
        schema: MINIMAL_SCHEMA,
        uiSchema: MINIMAL_UI_SCHEMA,
      } as RJSFSchema,
      onSubmitMock
    );

    render(
      <FormikTemplate>
        <FormEditor {...defaultProps} />
      </FormikTemplate>
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /add new field/i,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(
        {
          [RJSF_SCHEMA_PROPERTY_NAME]: {
            schema: {
              type: "object",
              properties: {
                field1: {
                  name: "field1",
                  title: "field1",
                  type: "string",
                },
              },
            },
            uiSchema: {
              "ui:order": ["field1", "*"],
            },
          },
        },
        expect.any(Object)
      );
    });
  });

  test("switches the required field", async () => {
    const fieldName = "firstName";
    const schema: Schema = {
      title: "A form",
      type: "object",
      properties: {
        [fieldName]: {
          type: "string",
          title: "First name",
        },
      },
    };
    const onSubmitMock = jest.fn();
    const FormikTemplate = createFormikTemplate(
      {
        schema,
        uiSchema: MINIMAL_UI_SCHEMA,
      } as RJSFSchema,
      onSubmitMock
    );

    const rendered = render(
      <FormikTemplate>
        <FormEditor activeField={fieldName} {...defaultProps} />
      </FormikTemplate>
    );

    const submitButton = screen.getByRole("button", { name: /submit/i });

    const getRequiredFieldFromMock = (callNumber: number) =>
      // eslint-disable-next-line security/detect-object-injection
      (onSubmitMock.mock.calls[callNumber][0][
        RJSF_SCHEMA_PROPERTY_NAME
      ] as RJSFSchema).schema.required;

    // Check the field is not required
    fireEvent.click(submitButton);
    await waitForEffect();
    expect(getRequiredFieldFromMock(0)).toBeUndefined();

    // Make it required
    const requiredSwitch = rendered.container.querySelector(".switch.btn");
    fireEvent.click(requiredSwitch);

    // Check the field is required
    fireEvent.click(submitButton);
    await waitForEffect();
    expect(getRequiredFieldFromMock(1)).toEqual([fieldName]);

    // Make it not required
    fireEvent.click(requiredSwitch);

    // Check the field is not required
    fireEvent.click(submitButton);
    await waitForEffect();
    expect(getRequiredFieldFromMock(2)).toEqual([]);
  });
});
