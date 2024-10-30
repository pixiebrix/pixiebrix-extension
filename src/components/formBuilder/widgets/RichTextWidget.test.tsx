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
import RichTextWidget from "@/components/formBuilder/widgets/RichTextWidget";
import { type WidgetProps } from "@rjsf/utils";
import { widgetPropsFactory } from "@/testUtils/factories/widgetFactories";
import userEvent from "@testing-library/user-event";
import CustomFormComponent from "@/bricks/renderers/CustomFormComponent";
import { type Schema } from "@/types/schemaTypes";

describe("RichTextWidget", () => {
  const defaultProps: WidgetProps = widgetPropsFactory();

  test("renders the RichTextWidget", () => {
    render(<RichTextWidget {...defaultProps} />);
    expect(screen.getByText("Hello TipTap! 🍌")).toBeInTheDocument();
  });

  test("updates form data when content changes", async () => {
    const onSubmit = jest.fn();
    const schema: Schema = {
      type: "object",
      properties: {
        content: {
          type: "string",
          title: "Content",
        },
      },
    };
    const uiSchema = {
      content: {
        "ui:widget": "richText",
      },
    };

    render(
      <CustomFormComponent
        schema={schema}
        formData={{ content: "" }}
        uiSchema={uiSchema}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={onSubmit}
      />,
    );

    const editor = screen.getByRole("textbox");
    await userEvent.type(editor, "Hello World");

    screen.getByRole("button", { name: "Submit" }).click();

    expect(onSubmit).toHaveBeenCalledWith(
      { content: "<p>Hello World</p>" },
      { submissionCount: 1 },
    );
  });

  test("handles initial form data", () => {
    const initialHtml = "<p>Initial content</p>";
    const schema: Schema = {
      type: "object",
      properties: {
        content: {
          type: "string",
          title: "Content",
        },
      },
    };
    const uiSchema = {
      content: {
        "ui:widget": "richtext",
      },
    };

    render(
      <CustomFormComponent
        schema={schema}
        formData={{ content: initialHtml }}
        uiSchema={uiSchema}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Initial content")).toBeInTheDocument();
  });
});
