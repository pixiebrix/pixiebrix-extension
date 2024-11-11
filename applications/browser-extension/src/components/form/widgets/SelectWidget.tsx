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

import React, { type ChangeEvent, useState, useMemo } from "react";
import { type CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import Select, {
  type GroupBase,
  type SelectComponentsConfig,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import Creatable from "react-select/creatable";
import useAddCreatablePlaceholder from "@/components/form/widgets/useAddCreatablePlaceholder";

// Type of the Select options
export type Option<TValue = string | null> = {
  label: string;
  value: TValue;
};

function isGroupedOption<TValue = string | null>(
  option: Option<TValue> | GroupBase<Option<TValue>>,
): option is GroupBase<Option<TValue>> {
  return "options" in option;
}

// Type passed as target in onChange event
export type SelectLike<TOption extends Option<TOption["value"]> = Option> = {
  value: TOption["value"];
  name: string;
  options: TOption[];
};

export type MultiSelectLike<TOption extends Option<TOption["value"]> = Option> =
  {
    value: Array<TOption["value"]>;
    name: string;
    options: TOption[];
  };

// Type of the SelectWidget.onChange event handler
// The signature of onChange is dictated by the compatibility with Formik. for a Widget to be compatible with Formik
// it should trigger onChange with an event, that has target and value
export type SelectWidgetOnChange<
  TOption extends Option<TOption["value"]> = Option,
> = React.ChangeEventHandler<SelectLike<TOption>>;

// Type of the SelectWidget props
export type SelectWidgetProps<TOption extends Option<TOption["value"]>> =
  CustomFieldWidgetProps<TOption["value"], SelectLike<TOption>> & {
    isClearable?: boolean;
    options?: TOption[] | Array<GroupBase<TOption>>;
    isLoading?: boolean;
    loadingMessage?: string;
    disabled?: boolean;
    components?: SelectComponentsConfig<TOption, boolean, GroupBase<TOption>>;
    className?: string;
    styles?: StylesConfig;
    isSearchable?: boolean;
    /**
     * True if the user can create new options. Default is false.
     */
    creatable?: boolean;
    placeholder?: string;
  };

const SelectWidget = <TOption extends Option<TOption["value"]>>({
  id,
  options,
  // Default to true to match the default isClearable value in SchemaSelectWidget
  isClearable = true,
  isLoading,
  disabled,
  value,
  onChange,
  name,
  components,
  className,
  styles,
  creatable = false,
  isSearchable = true,
  placeholder,
}: SelectWidgetProps<TOption>) => {
  const [textInputValue, setTextInputValue] = useState("");

  const optionsWithPlaceholder = useAddCreatablePlaceholder<
    NonNullable<SelectWidgetProps<TOption>["options"]>[number]
  >({
    creatable,
    options,
    textInputValue,
  });

  // Option will be null when the select is "cleared"
  const patchedOnChange = (newOption: SingleValue<TOption>) => {
    onChange({
      target: { value: newOption?.value ?? null, name, options },
    } as ChangeEvent<SelectLike<TOption>>);
  };

  const flatOptions = useMemo(
    () =>
      options?.flatMap<TOption>((option) => {
        if (isGroupedOption(option)) {
          return option.options;
        }

        return option;
      }),
    [options],
  );

  // Pass null instead of undefined if options is not defined
  const selectedOption =
    flatOptions?.find((option: TOption) => value === option.value) ?? null;

  const Component = creatable ? Creatable : Select;

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
      // This cast is to make strict null checks happy - react-select has funky typing issues for custom components
      components={
        components as Partial<
          SelectComponentsConfig<unknown, boolean, GroupBase<unknown>>
        >
      }
      styles={styles}
      isSearchable={isSearchable}
      placeholder={placeholder}
    />
  );
};

export default SelectWidget;
