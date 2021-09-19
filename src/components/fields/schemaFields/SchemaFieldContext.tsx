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
import React, { createContext } from "react";
import {
  FieldComponent,
  SchemaFieldProps,
} from "@/components/fields/schemaFields/propTypes";
import ServiceField, {
  SERVICE_BASE_SCHEMA,
} from "@/components/fields/schemaFields/ServiceField";
import ArrayField from "@/components/fields/schemaFields/ArrayField";
import ObjectField from "@/components/fields/schemaFields/ObjectField";
import {
  booleanPredicate,
  findOneOf,
  textPredicate,
} from "@/components/fields/schemaFields/schemaUtils";
import BooleanField from "@/components/fields/schemaFields/BooleanField";
import TextField from "@/components/fields/schemaFields/TextField";
import { isEmpty } from "lodash";

function makeOneOfField(oneOf: Schema): FieldComponent {
  const Field = getDefaultField(oneOf);
  const Component = (props: SchemaFieldProps<unknown>) => (
    <Field {...props} schema={oneOf} />
  );
  Component.displayName = Field.displayName;
  return Component;
}

export function getDefaultField(fieldSchema: Schema): FieldComponent {
  if (fieldSchema.$ref?.startsWith(SERVICE_BASE_SCHEMA)) {
    return ServiceField;
  }

  if (fieldSchema.type === "array") {
    return ArrayField;
  }

  if (fieldSchema.type === "object") {
    return ObjectField;
  }

  if (booleanPredicate(fieldSchema)) {
    return BooleanField;
  }

  if (textPredicate(fieldSchema)) {
    return TextField;
  }

  if (findOneOf(fieldSchema, booleanPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, booleanPredicate));
  }

  if (findOneOf(fieldSchema, textPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, textPredicate));
  }

  if (isEmpty(fieldSchema)) {
    // An empty field schema supports any value. For now, provide an object field since this just shows up
    // in the @pixiebrix/http brick.
    // https://github.com/pixiebrix/pixiebrix-extension/issues/709
    return ObjectField;
  }

  // Number, string, other primitives, etc.
  return TextField;
}

/**
 * A form field, including label, error message, etc.
 */
type CustomField = {
  match: (fieldSchema: Schema) => boolean;
  Component: FieldComponent;
};

/**
 * An individual form control (excluding label, error message, etc.)
 */
type CustomWidget = {
  match: (fieldSchema: Schema) => boolean;
  Component: FieldComponent;
};

export type CustomFieldDefinitions = {
  customFields: CustomField[];
  customWidgets: CustomWidget[];
};

/**
 * Context defining custom fields and widgets for schema-based fields.
 */
const SchemaFieldContext = createContext<CustomFieldDefinitions>({
  customFields: [],
  customWidgets: [],
});

export default SchemaFieldContext;
