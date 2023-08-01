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

import React, { type ChangeEvent, useState } from "react";
import { type CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import Select, {
  type GroupBase,
  type SelectComponentsConfig,
  type StylesConfig,
} from "react-select";
import Creatable from "react-select/creatable";
import { getErrorMessage } from "@/errors/errorHelpers";

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
export type SelectWidgetProps<TOption extends Option<TOption["value"]>> =
  CustomFieldWidgetProps<TOption["value"], SelectLike<TOption>> & {
    isClearable?: boolean;
    options: TOption[];
    isLoading?: boolean;
    loadError?: unknown;
    loadingMessage?: string;
    error?: unknown;
    disabled?: boolean;
    components?: SelectComponentsConfig<TOption, boolean, GroupBase<TOption>>;
    className?: string;
    styles?: StylesConfig;
    isSearchable?: boolean;
    /**
     * True if the user can create new options. Default is false.
     */
    creatable?: boolean;
  };

export const makeStringOptions = (...items: string[]): Option[] =>
  items.map((item) => ({
    label: item,
    value: item,
  }));

const SelectWidget = <TOption extends Option<TOption["value"]>>({
  id,
  options,
  // Default to true to match the default isClearable value in SchemaSelectWidget
  isClearable = true,
  isLoading,
  loadError,
  disabled,
  value,
  onChange,
  name,
  components,
  className,
  styles,
  creatable = false,
  isSearchable = true,
}: SelectWidgetProps<TOption>) => {
  const [textInputValue, setTextInputValue] = useState("");

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
  const selectedOption =
    options?.find((option: TOption) => value === option.value) ?? null;

  const Component = creatable ? Creatable : Select;

  // Disabled placeholder option to indicate that a user can create an option
  // If you change this, make sure you change the equivalent in SchemaSelectWidget.tsx
  const creatablePlaceholder = {
    value: "",
    label: "Start typing to filter or create new entry",
    isDisabled: true,
  };

  // Show placeholder if users can create new options and the search is empty
  const optionsWithPlaceholder =
    creatable && textInputValue.length === 0
      ? [creatablePlaceholder, ...options]
      : options;

  return (
    <Component
      className={className}
      menuPlacement="auto"
      inputId={id}
      name={name}
      isDisabled={disabled}
      isLoading={isLoading}
      isClearable={isClearable}
      options={optionsWithPlaceholder}
      onInputChange={setTextInputValue}
      value={selectedOption}
      onChange={patchedOnChange}
      components={components}
      styles={styles}
      isSearchable={isSearchable}
    />
  );
};

export default SelectWidget;
