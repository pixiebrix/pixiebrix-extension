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
import { Schema } from "@/core";
import { render } from "@testing-library/react";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import FieldTemplate from "@/components/formBuilder/FieldTemplate";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import {
  normalizeIncomingFormData,
  normalizeOutgoingFormData,
} from "./customForm";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";

describe("form data normalization", () => {
  test("normalizes non-empty incoming data", () => {
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

    const normalizedData = normalizeIncomingFormData(schema, data);
    const expectedData = {
      name: "John",
      age: 30,
      isAdmin: true,
      rating: 4.8,
    };

    expect(normalizedData).toStrictEqual(expectedData);
  });

  test("normalizes empty incoming data", () => {
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

    const normalizedData = normalizeIncomingFormData(schema, data);
    const expectedData = {
      name: "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- relaxed type checking in test
    } as any;

    expect(normalizedData).toStrictEqual(expectedData);
  });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- relaxed type checking in test
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

    // Submit and make sure there're no validation errors
    await userEvent.click(
      rendered.getByRole("button", {
        name: "Submit",
      })
    );

    expect(rendered.queryByText("Error")).not.toBeInTheDocument();
  });
});
