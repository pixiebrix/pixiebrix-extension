/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { DocumentElement, DocumentElementType } from "./documentBuilderTypes";
import { Expression } from "@/core";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { MarkdownRenderer } from "@/blocks/renderers/markdown";
import { uuidv4 } from "@/types/helpers";
import { defaultBlockConfig } from "@/blocks/util";

export function createNewElement(elementType: DocumentElementType) {
  const element: DocumentElement = {
    type: elementType,
    config: {},
  };

  switch (elementType) {
    case "header_1":
    case "header_2":
    case "header_3":
      element.config.title = "Header";
      break;

    case "text":
      element.config.text = "Paragraph text.";
      break;

    case "container":
      element.children = [createNewElement("row")];
      break;

    case "row":
      element.children = [createNewElement("column")];
      break;

    case "column":
      element.children = [];
      break;

    case "card":
      element.config.heading = "Header";
      element.children = [];
      break;

    case "pipeline": {
      const markdownBlock = new MarkdownRenderer();
      const markdownConfig: BlockConfig = {
        id: markdownBlock.id,
        instanceId: uuidv4(),
        config: defaultBlockConfig(markdownBlock.inputSchema),
      };
      element.config.pipeline = {
        __type__: "pipeline",
        __value__: [markdownConfig],
      } as Expression<BlockPipeline, "pipeline">;
      break;
    }

    case "button":
      element.config.title = "Click me";
      break;

    case "list":
      element.config.element = {
        __type__: "defer",
        __value__: createNewElement("text"),
      } as Expression<DocumentElement, "defer">;
      break;

    default:
      throw new Error(
        `Can't create new element. Type "${elementType} is not supported.`
      );
  }

  return element;
}
