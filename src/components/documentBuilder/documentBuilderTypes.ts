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

import { UnknownObject } from "@/types";
import { Expression } from "@/core";

export const DOCUMENT_ELEMENT_TYPES = [
  "header_1",
  "header_2",
  "header_3",
  "text",
  "container",
  "row",
  "column",
  "card",
  "block",
  "button",
  "list",
] as const;

export type DocumentElementType = typeof DOCUMENT_ELEMENT_TYPES[number];

export type DocumentElement<
  TType extends DocumentElementType = DocumentElementType,
  TConfig = UnknownObject
> = {
  type: TType;
  config: TConfig;
  children?: DocumentElement[];
};

type ListConfig = {
  array: Expression;
  elementKey?: string;
  element: Expression<DocumentElement, "defer">;
};
export type ListDocumentElement = DocumentElement<"list", ListConfig>;

export function isListDocument(
  element: DocumentElement
): element is ListDocumentElement {
  return element.type === "list";
}

export type DocumentComponent = {
  Component: React.ElementType;
  props?: UnknownObject | undefined;
};

export type BuildDocumentBranch = (root: DocumentElement) => DocumentComponent;
