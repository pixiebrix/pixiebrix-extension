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

import { Schema } from "@/core";
import {
  SchemaFieldComponent,
  SchemaFieldProps,
} from "@/components/fields/schemaFields/propTypes";
import React from "react";
import widgetsRegistry from "@/components/fields/schemaFields/widgets/widgetsRegistry";
import AppServiceField, {
  isAppServiceField,
} from "@/components/fields/schemaFields/AppServiceField";
import ServiceField, {
  isServiceField,
} from "@/components/fields/schemaFields/ServiceField";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import {
  booleanPredicate,
  findOneOf,
  textPredicate,
} from "@/components/fields/schemaFields/schemaUtils";
import BooleanField from "@/components/fields/schemaFields/BooleanField";
import { isEmpty } from "lodash";
import { defaultFieldFactory } from "@/components/fields/schemaFields/SchemaFieldContext";

const TextField = defaultFieldFactory(widgetsRegistry.TextWidget);
const ArrayField = defaultFieldFactory(widgetsRegistry.ArrayWidget);

function makeOneOfField(oneOf: Schema): SchemaFieldComponent {
  const Field = getDefaultField(oneOf);
  const Component = (props: SchemaFieldProps) => (
    <Field {...props} schema={oneOf} />
  );
  Component.displayName = Field.displayName;
  return Component;
}

export function getDefaultField(fieldSchema: Schema): SchemaFieldComponent {
  if (isAppServiceField(fieldSchema)) {
    return AppServiceField;
  }

  if (isServiceField(fieldSchema)) {
    return ServiceField;
  }

  if (fieldSchema.type === "array") {
    return ArrayField;
  }

  if (fieldSchema.type === "object") {
    return defaultFieldFactory(ObjectWidget);
  }

  if (booleanPredicate(fieldSchema)) {
    return BooleanField;
  }

  if (textPredicate(fieldSchema)) {
    return TextField;
  }

  if (findOneOf(fieldSchema, textPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, textPredicate));
  }

  if (findOneOf(fieldSchema, booleanPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, booleanPredicate));
  }

  if (isEmpty(fieldSchema)) {
    // An empty field schema supports any value. For now, provide an object field since this just shows up
    // in the @pixiebrix/http brick.
    // https://github.com/pixiebrix/pixiebrix-extension/issues/709
    return defaultFieldFactory(ObjectWidget);
  }

  // Number, string, other primitives, etc.
  return TextField;
}
