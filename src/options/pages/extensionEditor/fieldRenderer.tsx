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

import { Schema } from "@/core";
import React from "react";
import { FieldProps } from "@/components/fields/propTypes";
import TextField from "@/components/fields/TextField";
import BlockField, {
  SCHEMA_TYPE_TO_BLOCK_PROPERTY,
} from "@/components/fields/BlockField";
import IconField from "@/components/fields/IconField";
import UnsupportedField from "@/components/fields/UnknownField";
import BooleanField from "@/components/fields/BooleanField";

function makeOneOfField(
  oneOf: Schema
): React.FunctionComponent<FieldProps<unknown>> {
  const Renderer = defaultFieldRenderer(oneOf);
  const Component = (props: FieldProps<unknown>) => (
    <Renderer {...props} schema={oneOf} />
  );
  Component.displayName = Renderer.displayName;
  return Component;
}

type TypePredicate = (schema: Schema) => boolean;

const textPredicate = (schema: Schema) => schema.type === "string";
const booleanPredicate = (schema: Schema) => schema.type === "boolean";
const blockPredicate = (schema: Schema) =>
  !!SCHEMA_TYPE_TO_BLOCK_PROPERTY[schema["$ref"]];

function findOneOf(schema: Schema, predicate: TypePredicate): Schema {
  return schema.oneOf?.find(
    (x) => typeof x === "object" && predicate(x)
  ) as Schema;
}

export function defaultFieldRenderer(
  schema: Schema
): React.FunctionComponent<FieldProps<unknown>> {
  if (booleanPredicate(schema)) {
    return BooleanField;
  }
  if (textPredicate(schema)) {
    return TextField;
  }
  if (blockPredicate(schema)) {
    return BlockField;
  }
  if (schema["$ref"] === "https://app.pixiebrix.com/schemas/icon#") {
    return IconField;
  }
  if (findOneOf(schema, blockPredicate)) {
    return BlockField;
  }
  if (findOneOf(schema, textPredicate)) {
    return makeOneOfField(findOneOf(schema, textPredicate));
  }
  if (findOneOf(schema, booleanPredicate)) {
    return makeOneOfField(findOneOf(schema, booleanPredicate));
  }
  if (schema["$ref"] && !schema.type) {
    throw new Error(`Unexpected $ref ${schema["$ref"]}`);
  } else {
    // Not using reportError here because we generally know about this, and it generates an error every render
    // reportError(`Unsupported field type: ${schema.type ?? "<No type found>"}`);
    return UnsupportedField;
  }
}
