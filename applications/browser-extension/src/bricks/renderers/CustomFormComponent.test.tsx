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
import userEvent from "@testing-library/user-event";
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

  test("provides a submit handler to widgets via context", async () => {
    // Testing the RjsfSubmitContext.Provider with the textarea widget which uses it to submit the form on enter
    const schema: Schema = {
      type: "object",
      properties: {
        prompt: { type: "string", title: "Prompt" },
      },
    };
    const uiSchema = {
      prompt: {
        "ui:widget": "textarea",
        "ui:options": {
          submitOnEnter: true,
        },
      },
    };

    const submitForm = jest.fn();
    const { rerender } = render(
      <CustomFormComponent
        schema={schema}
        formData={{ prompt: "" }}
        uiSchema={uiSchema}
        submitCaption={""}
        autoSave={false}
        onSubmit={submitForm}
      />,
    );

    // Hidden:true because Stylesheets component sets hidden unless all stylesheets are loaded
    const textBox = screen.getByRole("textbox", {
      name: "Prompt",
      hidden: true,
    });

    await userEvent.type(textBox, "Some text");
    await userEvent.keyboard("{Enter}");
    expect(submitForm).toHaveBeenCalledWith(
      { prompt: "Some text" },
      { submissionCount: 1 },
    );
    await userEvent.type(textBox, " Some more text");
    await userEvent.keyboard("{Enter}");
    expect(submitForm).toHaveBeenCalledWith(
      { prompt: "Some text Some more text" },
      { submissionCount: 2 },
    );
    rerender(
      <CustomFormComponent
        schema={schema}
        formData={{ prompt: "Data from rerendered Form" }}
        uiSchema={uiSchema}
        submitCaption={""}
        autoSave={false}
        onSubmit={submitForm}
      />,
    );
    await userEvent.click(textBox);
    await userEvent.keyboard("{Enter}");
    expect(submitForm).toHaveBeenCalledWith(
      { prompt: "Data from rerendered Form" },
      { submissionCount: 3 },
    );
  });

  test("can reset on submit", async () => {
    const initialValue = "";

    const schema: Schema = {
      type: "object",
      properties: {
        prompt: { type: "string", title: "Prompt" },
      },
    };

    const submitForm = jest.fn();
    render(
      <CustomFormComponent
        schema={schema}
        formData={{ prompt: initialValue }}
        uiSchema={{}}
        submitCaption="Save"
        autoSave={false}
        onSubmit={submitForm}
        resetOnSubmit
      />,
    );

    const textBox = screen.getByRole("textbox", {
      name: "Prompt",
    });

    await userEvent.type(textBox, "Some text");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(submitForm).toHaveBeenCalledWith(
      { prompt: "Some text" },
      { submissionCount: 1 },
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(submitForm).toHaveBeenCalledWith(
      // Called with the initial value because the form was reset
      { prompt: initialValue },
      { submissionCount: 2 },
    );
  });

  test("don't reset by default", async () => {
    const initialValue = "";

    const schema: Schema = {
      type: "object",
      properties: {
        prompt: { type: "string", title: "Prompt" },
      },
    };

    const submitForm = jest.fn();
    render(
      <CustomFormComponent
        schema={schema}
        formData={{ prompt: initialValue }}
        uiSchema={{}}
        submitCaption="Save"
        autoSave={false}
        onSubmit={submitForm}
      />,
    );

    const textBox = screen.getByRole("textbox", {
      name: "Prompt",
    });

    await userEvent.type(textBox, "Some text");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(submitForm).toHaveBeenCalledWith(
      { prompt: "Some text" },
      { submissionCount: 1 },
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(submitForm).toHaveBeenCalledWith(
      // Called with same value because the form was not reset
      { prompt: "Some text" },
      { submissionCount: 2 },
    );
  });
});
