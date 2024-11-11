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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomFormComponent, {
  type CustomFormComponentProps,
} from "@/bricks/renderers/CustomFormComponent";
import { type Schema } from "@/types/schemaTypes";

describe("RichTextWidget", () => {
  const user = userEvent.setup({
    // 20ms delay between key presses to allow the editor state to update
    // before the next key press
    delay: 20,
  });

  const createSchema = (properties: Record<string, any>): Schema => ({
    type: "object",
    properties,
  });

  const createRichTextUiSchema = (fields: string[]) =>
    Object.fromEntries(
      fields.map((field) => [field, { "ui:widget": "richText" }]),
    );

  const renderRichTextForm = ({
    schema,
    uiSchema,
    formData,
    onSubmit = jest.fn(),
  }: Pick<CustomFormComponentProps, "schema" | "uiSchema" | "formData"> & {
    onSubmit?: jest.Mock;
  }) => {
    render(
      <CustomFormComponent
        schema={schema}
        formData={formData}
        uiSchema={uiSchema}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={onSubmit}
      />,
    );
    return { onSubmit };
  };

  test("updates form data when content changes", async () => {
    const { onSubmit } = renderRichTextForm({
      schema: createSchema({
        foo: { type: "string", title: "Foo" },
      }),
      uiSchema: createRichTextUiSchema(["foo"]),
      formData: { foo: "" },
    });

    const editor = screen.getByRole("textbox");
    await user.type(editor, "Hello World");
    screen.getByRole("button", { name: "Submit" }).click();

    expect(onSubmit).toHaveBeenCalledWith(
      { foo: "<p>Hello World</p>" },
      { submissionCount: 1 },
    );
  });

  test("can handle multiple rich text editors", async () => {
    const { onSubmit } = renderRichTextForm({
      schema: createSchema({
        foo: { type: "string", title: "Foo" },
        bar: { type: "string", title: "Bar" },
      }),
      uiSchema: createRichTextUiSchema(["foo", "bar"]),
      formData: { foo: "", bar: "" },
    });

    const [fooEditor, barEditor] = screen.getAllByRole("textbox");
    await user.type(fooEditor!, "Hello");
    await user.type(barEditor!, "Goodbye");
    screen.getByRole("button", { name: "Submit" }).click();

    expect(onSubmit).toHaveBeenCalledWith(
      {
        foo: "<p>Hello</p>",
        bar: "<p>Goodbye</p>",
      },
      { submissionCount: 1 },
    );
  });

  test("submits empty rich text fields", () => {
    const { onSubmit } = renderRichTextForm({
      schema: createSchema({
        foo: { type: "string", title: "Foo" },
      }),
      uiSchema: createRichTextUiSchema(["foo"]),
      formData: { foo: "" },
    });

    screen.getByRole("button", { name: "Submit" }).click();

    expect(onSubmit).toHaveBeenCalledWith({ foo: "" }, { submissionCount: 1 });
  });

  test("supports keyboard shortcuts and markdown shortcuts", async () => {
    const { onSubmit } = renderRichTextForm({
      schema: createSchema({
        foo: { type: "string", title: "Foo" },
      }),
      uiSchema: createRichTextUiSchema(["foo"]),
      formData: { foo: "" },
    });

    const editor = screen.getByRole("textbox");

    await user.type(editor, "regular, ");

    // Test bold/italic shortcuts
    await user.keyboard("{Control>}b{/Control}");
    await user.type(editor, "bold");
    await user.keyboard("{Control>}b{/Control}");

    await user.keyboard("{Control>}i{/Control}");
    await user.type(editor, "and italic");
    await user.keyboard("{Control>}i{/Control}");

    // Test bold and italic toolbar buttons
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.click(screen.getByRole("button", { name: "Italic" }));
    await user.type(editor, "bold and italic");

    // Test heading shortcuts
    await user.type(editor, "{enter}# Heading 1");
    await user.type(editor, "{enter}## Heading 2");
    await user.type(editor, "{enter}### Heading 3");

    // Test list shortcuts
    await user.type(editor, "{enter}* Bullet point");
    await user.type(editor, "{enter}{enter}- Another bullet");
    await user.type(editor, "{enter}{enter}1. Numbered item");

    // Test horizontal rule shortcuts
    await user.type(editor, "{enter}{enter}---___ ");

    screen.getByRole("button", { name: "Submit" }).click();

    expect(onSubmit).toHaveBeenCalledWith(
      {
        foo:
          "<p>" +
          "regular, <strong>bold</strong><em>and italic</em>" +
          "<strong><em>bold and italic</em></strong>" +
          "</p>" +
          "<h1>Heading 1</h1>" +
          "<h2>Heading 2</h2>" +
          "<h3>Heading 3</h3>" +
          "<ul><li><p>Bullet point</p></li><li><p>Another bullet</p></li></ul>" +
          "<ol><li><p>Numbered item</p></li></ol>" +
          "<hr><hr>" +
          "<p></p>",
      },
      { submissionCount: 1 },
    );
  }, 15_000);
});
