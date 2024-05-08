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
import { render } from "@/sidebar/testHelpers";
import CustomFormComponent from "@/bricks/renderers/CustomFormComponent";
import type { Schema } from "@/types/schemaTypes";
import selectEvent from "react-select-event";
import { act, screen } from "@testing-library/react";

const optionalFruitSchema: Schema = {
  type: "object",
  properties: {
    fruit: {
      type: "string",
      title: "Fruit",
      enum: ["apple", "banana", "cherry"],
    },
  },
};

describe("RjsfSelectWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("selects and and submit", async () => {
    const onSubmit = jest.fn();

    render(
      <CustomFormComponent
        schema={optionalFruitSchema}
        formData={{}}
        uiSchema={{}}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={onSubmit}
      />,
    );

    const select = screen.getByRole("combobox");

    await act(async () => {
      await selectEvent.select(select, "banana");
      screen.getByRole("button").click();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      {
        fruit: "banana",
      },
      { submissionCount: 1 },
    );
  });

  test("clears and submits", async () => {
    const onSubmit = jest.fn();

    render(
      <CustomFormComponent
        schema={optionalFruitSchema}
        formData={{}}
        uiSchema={{}}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={onSubmit}
      />,
    );

    const select = screen.getByRole("combobox");

    await act(async () => {
      await selectEvent.select(select, "banana");
    });

    await act(async () => {
      await selectEvent.clearAll(select);
    });

    screen.getByRole("button").click();

    expect(onSubmit).toHaveBeenCalledWith(
      {
        fruit: undefined,
      },
      { submissionCount: 1 },
    );
  });

  test("can't clear required field", async () => {
    const schema: Schema = {
      ...optionalFruitSchema,
      required: ["fruit"],
    };

    render(
      <CustomFormComponent
        schema={schema}
        formData={{}}
        uiSchema={{}}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={jest.fn()}
      />,
    );

    const select = screen.getByRole("combobox");

    await act(async () => {
      await selectEvent.select(select, "banana");
    });

    // Should fail because the clear all can't be found
    await expect(selectEvent.clearAll(select)).rejects.toThrow();
  });
});
