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

import { DocumentElement, DocumentElementType } from "./documentBuilderTypes";
import { DeferExpression, PipelineExpression } from "@/runtime/mapArgs";

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

    case "image":
      element.config.url = null;
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
      element.config.pipeline = {
        __type__: "pipeline",
        __value__: [],
      } as PipelineExpression;
      break;
    }

    case "button": {
      element.config.title = "Action";

      element.config.onClick = {
        __type__: "pipeline",
        __value__: [],
      } as PipelineExpression;

      break;
    }

    case "list":
      element.config.element = {
        __type__: "defer",
        __value__: createNewElement("text"),
      } as DeferExpression<DocumentElement>;
      break;

    default:
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        `Can't create new element. Type "${elementType} is not supported.`
      );
  }

  return element;
}
