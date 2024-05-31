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
import { render } from "@testing-library/react";
import { screen } from "shadow-dom-testing-library";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import validator from "@/validators/formValidator";
import {
  CustomFormRenderer,
  normalizeIncomingFormData,
  normalizeOutgoingFormData,
} from "./customForm";
import userEvent from "@testing-library/user-event";

import { dataStore } from "@/background/messenger/api";
import { type Schema } from "@/types/schemaTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { templates } from "@/components/formBuilder/RjsfTemplates";
import { toExpression } from "@/utils/expressionUtils";

const dataStoreGetMock = jest.mocked(dataStore.get);
const dataStoreSetSpy = jest.spyOn(dataStore, "set");

// I couldn't get shadow-dom-testing-library working
jest.mock("react-shadow/emotion", () => ({
  __esModule: true,
  default: {
    div(props: any) {
      return <div {...props}></div>;
    },
  },
}));

describe("form data normalization", () => {
  const normalizationTestCases = [
    {
      name: "non-empty incoming data",
      data: {
        name: "John",
        age: 30,
        isAdmin: true,
        rating: 4.8,
      },
      expected: {
        name: "John",
        age: 30,
        isAdmin: true,
        rating: 4.8,
      },
    },
    {
      name: "empty incoming data",
      data: {},
      expected: {},
    },
    {
      name: "incoming data with null values",
      data: {
        name: null as string,
        age: 30,
      },
      expected: {
        age: 30,
      },
    },
  ];
  test.each(normalizationTestCases)(
    "normalizes $name",
    ({ data, expected }) => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
          isAdmin: { type: "boolean" },
          rating: { type: "number" },
        },
      };

      const normalizedData = normalizeIncomingFormData(schema, data);

      expect(normalizedData).toStrictEqual(expected);
    },
  );

  test("normalizes non-empty outgoing data", () => {
    const schema: Schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        isAdmin: { type: "boolean" },
        rating: { type: "number" },
      },
    };

    const data = {
      name: "John",
      age: 30,
      isAdmin: true,
      rating: 4.8,
    };

    const normalizedData = normalizeOutgoingFormData(schema, data);
    const expectedData = {
      name: "John",
      age: 30,
      isAdmin: true,
      rating: 4.8,
    };

    expect(normalizedData).toStrictEqual(expectedData);
  });

  test("normalizes empty outgoing data", () => {
    const schema: Schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        isAdmin: { type: "boolean" },
        rating: { type: "number" },
      },
    };

    const data = {};

    const normalizedData = normalizeOutgoingFormData(schema, data);
    const expectedData = {
      name: null,
      age: null,
      isAdmin: null,
      rating: null,
    } as any;

    expect(normalizedData).toStrictEqual(expectedData);
  });

  test("renders normalized data", async () => {
    // A common data flow is:
    // 1. Collect form data and run through normalizeOutgoingFormData
    // 2. Send normalized data to the server
    // 3. Get data from the server
    // 4. Run through normalizeIncomingFormData and feed the form

    const schema: Schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        isAdmin: { type: "boolean" },
        rating: { type: "number" },
      },
    };

    const data = {};

    // This is what we'd send to server
    const outgoingData = normalizeOutgoingFormData(schema, data);

    // This is what we feed to the form
    const normalizedData = normalizeIncomingFormData(schema, outgoingData);

    const fields = {
      DescriptionField,
    };
    const uiWidgets = {
      imageCrop: ImageCropWidget,
    };

    const { asFragment } = render(
      <JsonSchemaForm
        schema={schema}
        formData={normalizedData}
        fields={fields}
        widgets={uiWidgets}
        validator={validator}
        templates={templates}
      />,
    );

    await expect(screen.findByRole("button")).resolves.toBeInTheDocument();

    // Make sure the form renders the data without errors
    expect(asFragment()).toMatchSnapshot();

    // Submit and make sure there are no validation errors
    await userEvent.click(
      screen.getByRole("button", {
        name: "Submit",
      }),
    );

    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });
});

describe("CustomFormRenderer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Render auto-saved form", async () => {
    const brick = new CustomFormRenderer();

    dataStoreGetMock.mockResolvedValue({});

    const { Component, props } = await brick.render(
      {
        storage: { type: "localStorage" },
        autoSave: true,
        recordId: "test",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      } as any,
      brickOptionsFactory(),
    );

    render(<Component {...props} />);

    expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    await expect(screen.findByRole("textbox")).resolves.toBeInTheDocument();
  });

  test("Supports postSubmitAction reset", async () => {
    const brick = new CustomFormRenderer();
    const runPipelineMock = jest.fn();

    dataStoreGetMock.mockResolvedValue({});

    const { Component, props } = await brick.render(
      {
        storage: { type: "localStorage" },
        recordId: "test",
        onSubmit: toExpression("pipeline", []),
        postSubmitAction: "reset",
        submitCaption: "Submit",
        uiSchema: {
          "ui:submitButtonOptions": { label: "Submit" },
        },
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      } as any,
      brickOptionsFactory({ runPipeline: () => runPipelineMock }),
    );

    render(<Component {...props} />);

    const textBox = await screen.findByRole("textbox");
    await userEvent.type(textBox, "Some text");
    expect(textBox).toHaveValue("Some text");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(runPipelineMock).toHaveBeenCalledOnce();

    expect(dataStoreSetSpy).not.toHaveBeenCalled();

    // Need to get new textbox reference, because the old one is removed when the key changes
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  test.each([undefined, "save"])(
    "postSubmitAction: %s doesn't reset",
    async (postSubmitAction) => {
      const brick = new CustomFormRenderer();
      const runPipelineMock = jest.fn();

      dataStoreGetMock.mockResolvedValue({});

      const { Component, props } = await brick.render(
        {
          storage: { type: "localStorage" },
          recordId: "test",
          onSubmit: toExpression("pipeline", []),
          postSubmitAction,
          submitCaption: "Submit",
          uiSchema: {
            "ui:submitButtonOptions": { label: "Submit" },
          },
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        } as any,
        brickOptionsFactory({ runPipeline: () => runPipelineMock }),
      );

      render(<Component {...props} />);

      const value = "Some text";
      const textBox = await screen.findByRole("textbox");

      await userEvent.type(textBox, value);

      await userEvent.click(screen.getByRole("button", { name: "Submit" }));

      expect(runPipelineMock).toHaveBeenCalledOnce();
      expect(dataStoreSetSpy).toHaveBeenCalledExactlyOnceWith("test", {
        name: value,
      });

      // Need to get new textbox reference, because the old one is removed if/when the key changes
      expect(screen.getByRole("textbox")).toHaveValue(value);
    },
  );

  test("is page state aware", async () => {
    const brick = new CustomFormRenderer();
    await expect(brick.isPageStateAware()).resolves.toBe(true);
  });
});
