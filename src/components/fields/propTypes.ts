/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import PropTypes from "prop-types";
import { Schema } from "@/core";

// https://json-schema.org/understanding-json-schema/reference/generic.html

export const schemaPropTypes = {
  type: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  description: PropTypes.string,
  default: PropTypes.any,
  enum: PropTypes.array,
};

export const fieldPropTypes = {
  field: PropTypes.string.isRequired,
  schema: PropTypes.shape(schemaPropTypes).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
};

export interface FieldProps<TValue> {
  name: string;
  label?: string;
  schema: Schema;
}
