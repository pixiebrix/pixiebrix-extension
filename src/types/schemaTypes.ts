/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

// Use our own name in the project so we can re-map/adjust the typing as necessary
import {
  type JSONSchema7,
  type JSONSchema7Definition,
  type JSONSchema7TypeName,
} from "json-schema";
import { type UiSchema as StandardUiSchema } from "@rjsf/core";
import type DOMPurify from "dompurify";

export type Schema = JSONSchema7;
export type UiSchema = StandardUiSchema;

export const KEYS_OF_UI_SCHEMA = [
  "ui:order",
  "ui:field",
  "ui:widget",
  "ui:options",
  "ui:order",
  "ui:FieldTemplate",
  "ui:ArrayFieldTemplate",
  "ui:ObjectFieldTemplate",
];
export type SchemaDefinition = JSONSchema7Definition;

/**
 * Type for a `properties` object in a JSON Schema.
 */
export type SchemaProperties = Record<string, SchemaDefinition>;

export type SchemaPropertyType = JSONSchema7TypeName;

/**
 * HTML allowed in input descriptions. Either directly or when rendered via markdown.
 *
 * Supporting a subset of the Phrasing Content tags: https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories#phrasing_content
 *
 * @since 1.7.28
 */
export const DESCRIPTION_ALLOWED_TAGS: DOMPurify.Config = {
  ALLOWED_TAGS: ["a", "b", "em", "i", "strong", "u", "s", "code", "span"],
};
