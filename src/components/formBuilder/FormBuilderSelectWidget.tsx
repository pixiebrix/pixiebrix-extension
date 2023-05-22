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
import React from "react";
import { type WidgetProps } from "@rjsf/core";
import Select from "react-select";
import { FormLabel, FormGroup } from "react-bootstrap";

type OptionType = { label: string; value: string };

const FormBuilderSelectWidget: React.FC<WidgetProps> = ({
  schema,
  id,
  options,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
  rawErrors,
  label,
}) => {
  const _onChange = (option: OptionType | null) => {
    onChange(option ? option.value : "");
  };

  const _onBlur = () => {
    onBlur(id, value);
  };

  const _onFocus = () => {
    onFocus(id, value);
  };

  const enumOptions = options.enumOptions as OptionType[];

  const selectOptions = enumOptions.map(({ value, label }) => ({
    value,
    label,
  }));

  return (
    <FormGroup>
      <FormLabel className={rawErrors?.length > 0 ? "text-danger" : ""}>
        {label || schema.title}
        {(label || schema.title) && required ? "*" : null}
      </FormLabel>
      <div data-testid="formbuilder-select-wrapper">
        <Select
          id={id}
          options={selectOptions}
          isDisabled={disabled || readonly}
          value={selectOptions.find((option) => option.value === value)}
          onChange={_onChange}
          onBlur={_onBlur}
          onFocus={_onFocus}
        />
      </div>
    </FormGroup>
  );
};

export default FormBuilderSelectWidget;
