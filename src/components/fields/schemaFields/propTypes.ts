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

import { Schema, UiSchema } from "@/core";
import React from "react";
import { FieldInputMode } from "./fieldInputMode";

// https://json-schema.org/understanding-json-schema/reference/generic.html

export type SchemaFieldComponent = React.FunctionComponent<SchemaFieldProps>;

export interface SchemaFieldProps {
  /**
   * The field name; generally used to identify this field in the form state
   */
  name: string;

  /**
   * The JSON Schema for the field property
   */
  schema: Schema;

  /**
   * Is this field required?
   */
  isRequired?: boolean;

  /**
   * A label for the field. If not provided, the label is automatically generated from the field name/schema.
   * @see fieldLabel
   */
  label?: React.ReactNode;

  /**
   * Description to override the description from the schema
   */
  description?: React.ReactNode;

  /**
   * The RJSF UiSchema for the field. WARNING: very little of the UiSchema surface area is supported
   */
  uiSchema?: UiSchema;

  /**
   * Hide the label. Used to hide the label where there's not enough space (e.g., properties in ObjectWidget and
   * ArrayWidget)
   * @see makeLabelForSchemaField
   * @see ObjectWidget
   * @see ArrayWidget
   */
  hideLabel?: boolean;

  /**
   * Is this field a nested object property? Used to prevent objects/arrays nested in objects.
   */
  isObjectProperty?: boolean;

  /**
   * Is this field an item in an array? Used to prevent arrays nested in arrays.
   */
  isArrayItem?: boolean;

  /**
   * Click handler for this field
   */
  onClick?: () => void;

  /**
   * Set this input to be focused
   */
  focusInput?: boolean;

  /**
   * If on blur the field is blank, the mode will be changed to Omit.
   */
  omitIfEmpty?: boolean;

  /**
   * The type to choose from the ToggleWidget by default
   * E.g. if the field was omitted and then added
   */
  defaultType?: FieldInputMode;
}
