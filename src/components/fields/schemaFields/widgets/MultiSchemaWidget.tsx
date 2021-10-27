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

import React from "react";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";

const MultiSchemaWidget: SchemaFieldComponent = ({
  name,
  schema,
  label,
  description,
}) => {
  const [
    { value: fieldValue },
    ,
    { setValue: setFieldValue },
  ] = useField<unknown>(name);

  const oneOf = schema.oneOf;
  if (oneOf && Array.isArray(oneOf)) {
    // Do we need to check for array/boolean here?
    // Render a switcher between the types in oneOf and render a schema field for each
  }

  const anyOf = schema.anyOf;
  if (anyOf && Array.isArray(anyOf)) {
    // Render all schema fields at the same time - NO, handle this like anyOf
  }

  // Need to return some kind of "JSONSchema X not supported" component
};

export default MultiSchemaWidget;
