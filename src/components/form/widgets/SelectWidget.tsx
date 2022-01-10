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

import React, { ChangeEvent } from "react";
import { CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import Select, { GroupBase, SelectComponentsConfig } from "react-select";
import { getErrorMessage } from "@/errors";

// Type of the Select options
export type Option<TValue = string> = {
  label: string;
  value: TValue;
};

// Type passed as target in onChange event
export type SelectLike<TOption extends Option<TOption["value"]> = Option> = {
  value: TOption["value"];
  name: string;
  options: TOption[];
};

// Type of the SelectWidget.onChange event handler
// The signature of onChange is dictated by the compatibility with Formik. for a Widget to be compatible with Formik
// it should trigger onChange with an event, that has target and value
export type SelectWidgetOnChange<
  TOption extends Option<TOption["value"]> = Option
> = React.ChangeEventHandler<SelectLike<TOption>>;

// Type of the SelectWidget props
type SelectWidgetProps<
  TOption extends Option<TOption["value"]>
> = CustomFieldWidgetProps<TOption["value"], SelectLike<TOption>> & {
  isClearable?: boolean;
  options: TOption[];
  isLoading?: boolean;
  loadError?: unknown;
  loadingMessage?: string;
  error?: unknown;
  disabled?: boolean;
  components?: SelectComponentsConfig<TOption, boolean, GroupBase<TOption>>;
};

const SelectWidget = <TOption extends Option<TOption["value"]>>({
  id,
  options,
  isClearable = false,
  isLoading,
  loadError,
  disabled,
  value,
  onChange,
  name,
  components,
}: SelectWidgetProps<TOption>) => {
  if (loadError) {
    return (
      <div className="text-danger">
        Error loading options: {getErrorMessage(loadError)}
      </div>
    );
  }

  // Option will be null when the select is "cleared"
  const patchedOnChange = (option: TOption | null) => {
    onChange({
      target: { value: option?.value ?? null, name, options },
    } as ChangeEvent<SelectLike<TOption>>);
  };

  // Pass null instead of undefined if options is not defined
  const selectValue =
    options?.find((option: TOption) => value === option.value) ?? null;

  return (
    <Select
      menuPlacement="auto"
      inputId={id}
      name={name}
      isDisabled={disabled}
      isLoading={isLoading}
      isClearable={isClearable}
      options={options}
      value={selectValue}
      onChange={patchedOnChange}
      components={components}
    />
  );
};

export default SelectWidget;
