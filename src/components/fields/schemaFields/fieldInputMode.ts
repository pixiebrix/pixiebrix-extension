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

import { TemplateEngine } from "@/core";
import { UnknownObject } from "@/types";
import { isExpression } from "@/runtime/mapArgs";

export type FieldInputMode =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "omit" // An input option to remove a property
  | TemplateEngine;

export function isTemplateEngine(
  inputMode: FieldInputMode
): inputMode is TemplateEngine {
  return ["mustache", "nunjucks", "handlebars", "var"].includes(inputMode);
}

export function inferInputMode(
  fieldConfig: UnknownObject,
  fieldName: string
): FieldInputMode {
  const hasField = fieldName in fieldConfig;
  if (!hasField) {
    return "omit";
  }

  // eslint-disable-next-line security/detect-object-injection -- config field names
  const value = fieldConfig[fieldName];

  if (isExpression(value)) {
    return value.__type__;
  }

  if (Array.isArray(value)) {
    return "array";
  }

  const typeOf: string = typeof value;
  if (
    typeOf === "string" ||
    typeOf === "number" ||
    typeOf === "boolean" ||
    typeOf === "object"
  ) {
    return typeOf;
  }

  return "string";
}

/*
XX

In the JS/JSON, we can expand these into an object:
  bar: {
    "__type__": "var",
    "__value__": "@input.bar"
  }

  In the Page Editor UX for block configs, for each field we'll provide a way to toggle between the expression type. The valid toggles are determined by the JSONSchema
  For examples:
      type: number: supports !var, !jq, and a number entry widget
      type: boolean: supports !var, !jq, and a toggle widget
      type: object: supports !var, !jq, and an object widget where the user can add properties. (The value of each property needs to support toggling)

type
- boolean
- string
  - minLength
  - maxLength
  - pattern
  - format
    - date-time -> type="datetime-local"
    - time      -> type="time"
    - date      -> type="date"
    - duration  - X
    - email     -> type="email"
    - uri       -> type="url"
- integer
- number
  - multipleOf
  - minimum
  - exclusiveMinimum
  - maximum
  - exclusiveMaximum
- array
  - items (1 schema for all items in the array)
  - minItems
  - maxItems
  - uniqueItems (boolean to require uniqueness)
- object
  - properties (name->schema)
  - patternProperties (regex(name)->schema)
  - additionalProperties (schema | false)
  - required (name[])
  - propertyNames (predicate<name>)
  - minProperties
  - maxProperties

- Schema composition
  - allOf - X
  - anyOf
  - oneOf
  - not - X

- Generic
  - default - use this when switching types to set the value
  - enum
  - const

{
  description: "A full name or part of the name"
	anyOf: [
	        {type: number},
		{type: string, description: "Your full name"}
		{type: object, properties: {firstName: {type: string}}, title: "Name", description: "Part of the the name"}
		{type: object, properties: {query: {type: string}}, title: "Other Name, description: "Missing record object"}
   	  ]
}

	  number
	  !var
	  !jq

	  string
	  mustace
	  nunjucks
	  !jq
	  !var

	  object - Name
	  !jq
	  !var

	  object - Other Name
	  !jq
	  !var

	  number
	  string
	  object - Name
	  object - Other Name
          mustache
	  nunjucks
	  !jq
	  !var

	  One idea:

	  Track which alternative the user chose:
	  __alternative__: "Name"

 */
