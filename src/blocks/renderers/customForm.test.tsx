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
import { render } from "@testing-library/react";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import FieldTemplate from "@/components/formBuilder/FieldTemplate";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import {
  CustomFormRenderer,
  normalizeIncomingFormData,
  normalizeOutgoingFormData,
} from "./customForm";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4 } from "@/types/helpers";

import { dataStore } from "@/background/messenger/api";
import { Schema } from "@/types/schemaTypes";
import { BlockOptions } from "@/types/runtimeTypes";

const dataStoreGetMock = dataStore.get as jest.MockedFunction<
  typeof dataStore.get
>;

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
    }
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

    const rendered = render(
      <JsonSchemaForm
        schema={schema}
        formData={normalizedData}
        fields={fields}
        widgets={uiWidgets}
        FieldTemplate={FieldTemplate}
      />
    );

    await waitForEffect();

    // Make sure the form renders the data without errors
    expect(rendered.asFragment()).toMatchSnapshot();

    // Submit and make sure there are no validation errors
    await userEvent.click(
      rendered.getByRole("button", {
        name: "Submit",
      })
    );

    expect(rendered.queryByText("Error")).not.toBeInTheDocument();
  });
});

describe("CustomFormRenderer", () => {
  test("Render autosaved form", async () => {
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
      {
        logger: new ConsoleLogger({
          extensionId: uuidv4(),
        }),
      } as BlockOptions
    );

    const rendered = render(<Component {...props} />);

    expect(rendered.queryByText("Submit")).toBeNull();
    expect(rendered.container.querySelector("#root_name")).not.toBeNull();
  });
});
