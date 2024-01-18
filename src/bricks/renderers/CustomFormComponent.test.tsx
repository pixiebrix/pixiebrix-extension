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

import CustomFormComponent from "@/bricks/renderers/CustomFormComponent";
import {
  normalizeOutgoingFormData,
  normalizeIncomingFormData,
} from "@/bricks/renderers/customForm";
import { render, screen } from "@testing-library/react";
import React from "react";
import { type Schema } from "@/types/schemaTypes";
import { type JsonObject } from "type-fest";

describe("CustomFormComponent", () => {
  test("renders a text input with inputmode numeric in place of a number input", () => {
    const schema: Schema = {
      type: "object",
      properties: {
        rating: { type: "number", title: "Rating" },
      },
    };

    const data = {};

    // This is what we'd send to server
    const outgoingData = normalizeOutgoingFormData(schema, data);

    // This is what we feed to the form
    const normalizedData = normalizeIncomingFormData(
      schema,
      outgoingData,
    ) as JsonObject;

    render(
      <CustomFormComponent
        schema={schema}
        formData={normalizedData}
        uiSchema={{}}
        submitCaption={""}
        autoSave={false}
        onSubmit={jest.fn()}
      />,
    );

    expect(
      // Hidden:true because Stylesheets component sets hidden unless all stylesheets are loaded
      screen.getByRole("textbox", { name: "Rating", hidden: true }),
    ).toHaveAttribute("inputmode", "numeric");

    expect(screen.queryByRole("spinButton")).not.toBeInTheDocument();
  });
});
