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
