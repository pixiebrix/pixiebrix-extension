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

import { isUUID } from "../../types/helpers";
import { createNewDocumentBuilderElement } from "./createNewDocumentBuilderElement";
import { DOCUMENT_BUILDER_ELEMENT_TYPES } from "./documentBuilderTypes";
import { type BrickPipeline } from "../../bricks/types";
import { toExpression } from "../../utils/expressionUtils";

test.each(
  DOCUMENT_BUILDER_ELEMENT_TYPES.filter(
    (x) => !["header_1", "header_2", "header_3"].includes(x),
  ),
)("sets correct element type for %s", (elementType) => {
  const actual = createNewDocumentBuilderElement(elementType);
  expect(actual.type).toBe(elementType);
});

test("sets default config for header", () => {
  const headerElement = createNewDocumentBuilderElement("header");
  expect(headerElement.config).toEqual({ title: "Header", heading: "h1" });
});

test("sets default config for text", () => {
  const textElement = createNewDocumentBuilderElement("text");
  expect(textElement.config).toEqual({
    text: "Paragraph text. **Markdown** is supported.",
    enableMarkdown: true,
  });
});

test("sets default config and children for container", () => {
  const containerElement = createNewDocumentBuilderElement("container");
  expect(containerElement.config).toEqual({});
  expect(containerElement.children).toEqual([
    {
      type: "row",
      config: {},
      children: [{ type: "column", config: {}, children: [] }],
    },
  ]);
});

test("sets default config and children for row", () => {
  const rowElement = createNewDocumentBuilderElement("row");
  expect(rowElement.config).toEqual({});
  expect(rowElement.children).toEqual([
    { type: "column", config: {}, children: [] },
  ]);
});

test("sets default config and children for column", () => {
  const columnElement = createNewDocumentBuilderElement("column");
  expect(columnElement.config).toEqual({});
  expect(columnElement.children).toEqual([]);
});

test("sets default config and children for card", () => {
  const cardElement = createNewDocumentBuilderElement("card");
  expect(cardElement.config).toEqual({ heading: "Header" });
  expect(cardElement.children).toEqual([]);
});

test("sets default config for block", () => {
  const expectedConfig = {
    label: "Brick",
    pipeline: toExpression("pipeline", []),
  };
  const pipelineElement = createNewDocumentBuilderElement("pipeline");

  expect(pipelineElement.config).toEqual(expectedConfig);
});

test("sets default config for button", () => {
  const expectedConfig = {
    label: "Button",
    title: "Action",
    size: "md",
    hidden: false,
    fullWidth: false,
    variant: "primary",
    disabled: false,
    onClick: toExpression("pipeline", [] as BrickPipeline),
  };

  const buttonElement = createNewDocumentBuilderElement("button");
  expect(buttonElement.config).toEqual(expectedConfig);
});

test("throws on unknown components", () => {
  expect(() => {
    // @ts-expect-error intentionally testing an invalid value
    createNewDocumentBuilderElement("unknown");
  }).toThrow();
});

test("sets padding to zero for form", () => {
  const formElement = createNewDocumentBuilderElement("form");
  expect(formElement.type).toBe("pipeline");
  expect((formElement.config as any).pipeline.__value__[0].id).toBe(
    "@pixiebrix/form",
  );
  expect(
    isUUID((formElement.config as any).pipeline.__value__[0].instanceId),
  ).toBe(true);
  expect(
    (formElement.config as any).pipeline.__value__[0].config.className,
  ).toBe("p-0");
});
