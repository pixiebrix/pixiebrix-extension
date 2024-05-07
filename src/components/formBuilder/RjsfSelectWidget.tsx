/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { type WidgetProps } from "@rjsf/utils";
import Select from "react-select";

type OptionType = { label: string; value: string };

const DEFAULT_OPTION: OptionType[] = [];

const RjsfSelectWidget: React.FC<WidgetProps> = ({
  id,
  options,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
  multiple,
}) => {
  const _onChange = (option: OptionType | null) => {
    // Pass `undefined` on clear to indicate no value is selected. In JSON Schema validation, `null` is a type
    onChange(option ? option.value : undefined);
  };

  const _onBlur = () => {
    onBlur(id, value);
  };

  const _onFocus = () => {
    onFocus(id, value);
  };

  // Check to ensure enumOptions is an array
  // RJSF seems to occasionally set enumOptions as FALSE. Maybe related to async options:
  // https://github.com/rjsf-team/react-jsonschema-form/issues/415
  const enumOptions = (options.enumOptions || DEFAULT_OPTION) as OptionType[];

  const selectOptions =
    enumOptions.map(({ value, label }) => ({
      value,
      label,
    })) ?? [];

  return (
    <div data-testid="formbuilder-select-wrapper">
      <Select
        id={id}
        isClearable={!required}
        options={selectOptions}
        isDisabled={disabled || readonly}
        isMulti={multiple}
        menuPlacement="auto"
        value={selectOptions.find((option) => option.value === value)}
        onChange={_onChange}
        onBlur={_onBlur}
        onFocus={_onFocus}
      />
    </div>
  );
};

export default RjsfSelectWidget;
