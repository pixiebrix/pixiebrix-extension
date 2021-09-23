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

import React from "react";
import { WidgetProps } from "@/components/form/FieldTemplate";
import Select from "react-select";
import { getErrorMessage } from "@/errors";

export type Option = {
  label: string;
  value: string | number;
};

type OwnProps = {
  isClearable?: boolean;
  options: Option[];
  isLoading?: boolean;
  loadingMessage?: string;
  loadError?: unknown;
  disabled?: boolean;
};

const SelectWidget: React.FC<WidgetProps<HTMLSelectElement> & OwnProps> = ({
  options,
  isClearable = false,
  isLoading,
  loadError,
  disabled,
  value,
  onChange,
  name,
}) => {
  if (loadError) {
    return (
      <div className="text-danger">
        Error loading options: {getErrorMessage(loadError)}
      </div>
    );
  }

  const patchedOnChange = ({ value }: Option) => {
    // Faking an onChange event of HTML Select, disregarding typings
    onChange({ target: { value, name, options: options } } as any);
  };

  return (
    <Select
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
