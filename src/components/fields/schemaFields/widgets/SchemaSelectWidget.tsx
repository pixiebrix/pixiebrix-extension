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

import React, { useCallback, useMemo, useRef, useState } from "react";
import Select, { type Options } from "react-select";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { compact, isEmpty, uniq, uniqBy } from "lodash";
import { useField } from "formik";
import Creatable from "react-select/creatable";
import useAutoFocusConfiguration from "@/hooks/useAutoFocusConfiguration";
import { type Schema } from "@/types/schemaTypes";
import { isLabelledEnumField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isExpression } from "@/utils/expressionUtils";

type StringOption = {
  value: string;
};

type StringOptionsType = Options<StringOption>;

/**
 * Return the options for a SelectWidget based on the schema and user input.
 * @param schema the JSONSchema for the field
 * @param value the current value of the field, to ensure an option exists for it
 * @param created the values the user has created
 */
export function mapSchemaToOptions({
  schema,
  value,
  created,
}: {
  schema: Pick<Schema, "examples" | "enum" | "type" | "oneOf">;
  value: string;
  created: string[];
}): {
  creatable: boolean;
  options: StringOptionsType;
} {
  if (schema.type !== "string") {
    // Should never hit this, because SchemaSelectWidget should only be rendered for string fields
    return {
      creatable: false,
      options: [],
    };
  }

  const primitiveValues = schema.examples ?? schema.enum;

  const schemaOptions = isLabelledEnumField(schema)
    ? schema.oneOf.map((x) => ({ value: x.const, label: x.title ?? x.const }))
    : Array.isArray(primitiveValues)
    ? primitiveValues.map((value: string) => ({ value, label: value }))
    : [];

  const userOptions = compact([value, ...created])
    .filter(
      (value) =>
        !schemaOptions.some((schemaOption) => value === schemaOption.value)
    )
    .map((value) => ({
      value,
      label: value,
    }));

  return {
    creatable: Boolean(schema.examples),
    options: uniqBy([...userOptions, ...schemaOptions], "value"),
  };
}

const SchemaSelectWidget: React.VFC<
  SchemaFieldProps & { placeholder?: string }
> = ({ name, schema, isRequired, focusInput, placeholder, uiSchema }) => {
  const [created, setCreated] = useState([]);
  const [{ value: fieldValue }, , { setValue }] = useField(name);

  const { isSearchable = true, isClearable = false } = uiSchema;

  const elementRef = useRef();
  useAutoFocusConfiguration({ elementRef, focus: focusInput });

  // Need to handle expressions because this field could be toggled to "var"
  // and the Widget won't change until the input mode can be inferred again
  // from the new value.
  const value = isExpression(fieldValue) ? fieldValue.__value__ : fieldValue;

  const { creatable, options } = useMemo(
    () =>
      mapSchemaToOptions({
        schema,
        created,
        value,
      }),
    [schema, created, value]
  );

  const selectedValue = options.find((x) => x.value === value) ?? {
    value: null,
  };

  const selectOnChange = useCallback(
    (option: StringOption) => {
      setValue(option?.value ?? null);
    },
    [setValue]
  );

  if (isEmpty(options)) {
    console.warn("No select options found", { schema, value });
  }

  return creatable ? (
    <Creatable
      inputId={name}
      isClearable={!isRequired}
      options={options}
      onCreateOption={(value) => {
        setValue(value);
        setCreated(uniq([...created, value]));
      }}
      value={selectedValue}
      onChange={selectOnChange}
      ref={elementRef}
      placeholder={placeholder}
      openMenuOnFocus={true}
    />
  ) : (
    <Select
      inputId={name}
      isClearable={!isRequired && isClearable}
      options={options}
      value={selectedValue}
      onChange={selectOnChange}
      ref={elementRef}
      openMenuOnFocus={true}
      isSearchable={isSearchable}
    />
  );
};

export default SchemaSelectWidget;
