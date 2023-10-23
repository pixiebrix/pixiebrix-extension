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
import { isEmpty, uniq } from "lodash";
import { useField } from "formik";
import useAutoFocusConfiguration from "@/hooks/useAutoFocusConfiguration";
import { isExpression } from "@/utils/expressionUtils";
import { mapSchemaToOptions } from "@/components/fields/schemaFields/selectFieldUtils";
import Creatable from "react-select/creatable";
import useAddCreatablePlaceholder from "@/components/form/widgets/useAddCreatablePlaceholder";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

export type StringOption = {
  label: string;
  value: string;
};

export type StringOptionsType = Options<StringOption>;

const SchemaSelectWidget: React.VFC<
  SchemaFieldProps & { placeholder?: string }
> = ({ name, schema, isRequired, focusInput, placeholder, uiSchema }) => {
  const [created, setCreated] = useState([]);
  const [{ value: fieldValue }, , { setValue }] = useField(name);

  // Defaulting to true for these options
  const { isSearchable = true, isClearable = true } =
    uiSchema?.options?.props ?? {};

  const elementRef = useRef();
  useAutoFocusConfiguration({ elementRef, focus: focusInput });

  // Need to handle expressions because this field could be toggled to "var"
  // and the Widget won't change until the input mode can be inferred again
  // from the new value.
  const value = isExpression(fieldValue) ? fieldValue.__value__ : fieldValue;

  const [textInputValue, setTextInputValue] = useState("");

  const { creatable, options } = useMemo(
    () =>
      mapSchemaToOptions({
        schema,
        created,
        value,
      }),
    [schema, created, value]
  );

  // Show placeholder if users can create new options and the search is empty
  const optionsWithPlaceholder = useAddCreatablePlaceholder({
    creatable,
    options,
    textInputValue,
  });

  const selectedValue = options.find((x) => x.value === value) ?? {
    label: null,
    value: null,
  };

  const selectOnChange = useCallback(
    async (option: StringOption) => {
      if (option == null) {
        await setValue(null);
        reportEvent(Events.SCHEMA_SELECT_WIDGET_CLEAR, {
          field_name: name,
          schema_title: schema.title,
        });
      } else {
        await setValue(option.value);
        reportEvent(Events.SCHEMA_SELECT_WIDGET_SELECT, {
          field_name: name,
          schema_title: schema.title,
          option_label: option.label,
          option_value: option.value,
        });
      }
    },
    [name, schema.title, setValue]
  );

  if (isEmpty(options)) {
    console.warn("No select options found", { schema, value });
  }

  return creatable ? (
    <Creatable
      inputId={name}
      isClearable={!isRequired}
      options={optionsWithPlaceholder}
      onCreateOption={async (value) => {
        await setValue(value);
        setCreated(uniq([...created, value]));
      }}
      value={selectedValue}
      onChange={selectOnChange}
      ref={elementRef}
      placeholder={placeholder}
      openMenuOnFocus={true}
      onInputChange={setTextInputValue}
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
