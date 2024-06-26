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

import {
  DOCUMENT_BUILDER_ELEMENT_TYPES,
  type DocumentBuilderElement,
  type DocumentBuilderElementType,
} from "./documentBuilderTypes";

export const ROOT_ELEMENT_TYPES: DocumentBuilderElementType[] = [
  "header",
  "text",
  "image",
  "container",
  "card",
  "pipeline",
  "button",
  "list",
];

export const PARENT_ELEMENT_TYPES: DocumentBuilderElementType[] = [
  "row",
  "column",
  "container",
  "card",
  "list",
];

const ALLOWED_CHILD_TYPES: Record<string, DocumentBuilderElementType[]> = {
  container: ["row", "list"],
  row: ["column", "list"],
  column: ["header", "text", "image", "card", "pipeline", "button", "list"],
  card: ["header", "text", "image", "container", "pipeline", "button", "list"],
  // Any element we can add to the list
  list: DOCUMENT_BUILDER_ELEMENT_TYPES as unknown as DocumentBuilderElementType[],
};

// HTML5/Bootstrap supports H1-H6: https://getbootstrap.com/docs/4.0/content/typography/
export const VALID_HEADER_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

export function getAllowedChildTypes(
  parentElement: DocumentBuilderElement,
): DocumentBuilderElementType[] {
  return ALLOWED_CHILD_TYPES[parentElement.type] ?? [];
}
