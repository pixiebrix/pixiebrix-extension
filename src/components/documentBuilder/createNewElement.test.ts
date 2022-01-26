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

import { createNewElement } from "./createNewElement";
import {
  DocumentElementType,
  DOCUMENT_ELEMENT_TYPES,
} from "./documentBuilderTypes";
import { defaultBlockConfig } from "@/blocks/util";
import { MarkdownRenderer } from "@/blocks/renderers/markdown";
import { ConfettiEffect } from "@/blocks/effects/confetti";

test.each(DOCUMENT_ELEMENT_TYPES)(
  "sets correct element type for %s",
  (elementType) => {
    const actual = createNewElement(elementType);
    expect(actual.type).toBe(elementType);
  }
);

test.each(["header_1", "header_2", "header_3"])(
  "sets default config for %s",
  (headerType: DocumentElementType) => {
    const actual = createNewElement(headerType);
    expect(actual.config).toEqual({ title: "Header" });
  }
);

test("sets default config for text", () => {
  const actual = createNewElement("text");
  expect(actual.config).toEqual({ text: "Paragraph text." });
});

test("sets default config and children for container", () => {
  const actual = createNewElement("container");
  expect(actual.config).toEqual({});
  expect(actual.children).toEqual([
    {
      type: "row",
      config: {},
      children: [{ type: "column", config: {}, children: [] }],
    },
  ]);
});

test("sets default config and children for row", () => {
  const actual = createNewElement("row");
  expect(actual.config).toEqual({});
  expect(actual.children).toEqual([
    { type: "column", config: {}, children: [] },
  ]);
});

test("sets default config and children for column", () => {
  const actual = createNewElement("column");
  expect(actual.config).toEqual({});
  expect(actual.children).toEqual([]);
});

test("sets default config and children for card", () => {
  const actual = createNewElement("card");
  expect(actual.config).toEqual({ heading: "Header" });
  expect(actual.children).toEqual([]);
});

test("sets default config for block", () => {
  const markdownBlock = new MarkdownRenderer();
  const expectedConfig = {
    pipeline: {
      __type__: "pipeline",
      __value__: [
        {
          id: markdownBlock.id,
          instanceId: expect.any(String),
          config: defaultBlockConfig(markdownBlock.inputSchema),
        },
      ],
    },
  };
  const actual = createNewElement("pipeline");

  expect(actual.config).toEqual(expectedConfig);
});

test("sets default config for button", () => {
  const confettiEffect = new ConfettiEffect();
  const expectedConfig = {
    title: "Action",
    onClick: {
      __type__: "pipeline",
      __value__: [
        {
          id: confettiEffect.id,
          instanceId: expect.any(String),
          config: defaultBlockConfig(confettiEffect.inputSchema),
        },
      ],
    },
  };

  const actual = createNewElement("button");
  expect(actual.config).toEqual(expectedConfig);
});

test("throws on unknown elements", () => {
  expect(() => {
    createNewElement("unknown" as any);
  }).toThrow();
});
