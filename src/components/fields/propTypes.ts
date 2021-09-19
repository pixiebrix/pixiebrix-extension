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

import * as PropTypes from "prop-types";
import { Schema, UiSchema } from "@/core";

// https://json-schema.org/understanding-json-schema/reference/generic.html

export const schemaPropTypes = {
  type: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  description: PropTypes.string,
  default: PropTypes.any,
  enum: PropTypes.array,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Use the generic or drop it from FieldProps usage
export interface SchemaFieldProps<TValue> {
  name: string;
  label?: string;
  schema: Schema;
  uiSchema?: UiSchema;
}
