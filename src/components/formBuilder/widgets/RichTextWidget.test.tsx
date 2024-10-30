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
import CustomFormComponent from "@/bricks/renderers/CustomFormComponent";
import { type Schema } from "@/types/schemaTypes";

describe("RichTextWidget", () => {
  // TODO: need to move this to a mock file in __mocks__, but the file isn't getting picked up
  beforeAll(() => {
    // See https://stackoverflow.com/questions/68023284/react-testing-library-user-event-throws-error-typeerror-root-elementfrompoint/77219899#77219899
    function getBoundingClientRect(): DOMRect {
      const rec = {
        x: 0,
        y: 0,
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
      };
      return { ...rec, toJSON: () => rec };
    }

    class FakeDOMRectList extends Array<DOMRect> implements DOMRectList {
      // @ts-expect-error -- mock for testing
      item(index: number): DOMRect | undefined {
        return this[index];
      }
    }

    document.elementFromPoint = (): null => null;
    HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
    HTMLElement.prototype.getClientRects = (): DOMRectList =>
      // @ts-expect-error -- mock for testing
      new FakeDOMRectList();
    Range.prototype.getBoundingClientRect = getBoundingClientRect;
    // @ts-expect-error -- mock for testing
    Range.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();
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
      // TODO: Should be "<p>Hello World</p>"; this is only happening in unit tests
      { content: "<p></p><p>Hello World</p>" },
      { submissionCount: 1 },
    );
  });

  test("can handle multiple rich text editors", async () => {
    const onSubmit = jest.fn();
    const schema: Schema = {
      type: "object",
      properties: {
        foo: {
          type: "string",
          title: "Foo",
        },
        bar: {
          type: "string",
          title: "Bar",
        },
      },
    };
    const uiSchema = {
      foo: {
        "ui:widget": "richText",
      },
      bar: {
        "ui:widget": "richText",
      },
    };

    render(
      <CustomFormComponent
        schema={schema}
        formData={{ foo: "", bar: "" }}
        uiSchema={uiSchema}
        submitCaption="Submit"
        autoSave={false}
        onSubmit={onSubmit}
      />,
    );

    const [fooEditor, barEditor] = screen.getAllByRole("textbox");

    await userEvent.type(fooEditor!, "Hello");
    await userEvent.type(barEditor!, "Goodbye");

    screen.getByRole("button", { name: "Submit" }).click();

    expect(onSubmit).toHaveBeenCalledWith(
      {
        foo: "<p></p><p>Hello</p>",
        bar: "<p></p><p>Goodbye</p>",
      },
      { submissionCount: 1 },
    );
  });
});
