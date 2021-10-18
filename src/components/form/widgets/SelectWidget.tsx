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
import Select from "react-select";
import { getErrorMessage } from "@/errors";

// Type of the Select options
export type Option<TValue = string> = {
  label: string;
  value: TValue;
};

// Type passed as target in onChange event
type SelectLike<TOption extends Option = Option> = {
  value: TOption["value"];
  name: string;
  options: TOption[];
};

// Type of the SelectWidget.onChange event handler
// The signature of onChange is dictated by the compatibility with Formik. for a Widget to be compatible with Formik
// it should trigger onChange with an event, that has target and value
export type SelectWidgetOnChange<
  TOption extends Option = Option
> = React.ChangeEventHandler<SelectLike<TOption>>;

// Type of the SelectWidget props
type SelectWidgetProps<TOption extends Option> = CustomFieldWidgetProps<
  TOption["value"],
  SelectLike<TOption>
> & {
  isClearable?: boolean;
  options: TOption[];
  isLoading?: boolean;
  loadError?: unknown;
  loadingMessage?: string;
  error?: unknown;
  disabled?: boolean;
};

// Type of the SelectWidget
export type TSelectWidget<TOption extends Option> = React.FC<
  SelectWidgetProps<TOption>
>;

const SelectWidget = <TOption extends Option>({
  id,
  options,
  isClearable = false,
  isLoading,
  loadError,
  disabled,
  value,
  onChange,
  name,
}: SelectWidgetProps<TOption>) => {
  if (loadError) {
    return (
      <div className="text-danger">
        Error loading options: {getErrorMessage(loadError)}
      </div>
    );
  }

  const patchedOnChange = ({ value }: Option) => {
    onChange({ target: { value, name, options } } as ChangeEvent<
      SelectLike<TOption>
    >);
  };

  return (
    <Select
      inputId={id}
      name={name}
      isDisabled={disabled}
      isLoading={isLoading}
      isClearable={isClearable}
      options={options}
      value={options?.find((option: Option) => value === option.value)}
      onChange={patchedOnChange}
    />
  );
};

export default SelectWidget;
