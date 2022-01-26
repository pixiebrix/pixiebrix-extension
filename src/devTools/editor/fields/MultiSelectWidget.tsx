/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { useField } from "formik";
import Select from "react-select";

type Option = {
  label: string;
  value: unknown;
};

type MultiSelectWidgetProps = {
  id?: string;
  name: string;
  disabled?: boolean;
  isClearable?: boolean;
  options: Option[];
};

const MultiSelectWidget: React.FC<MultiSelectWidgetProps> = ({
  options,
  isClearable = false,
  disabled,
  ...props
}) => {
  const [field, , helpers] = useField<unknown[]>(props);
  return (
    <Select
      isMulti
      isDisabled={disabled}
      isClearable={isClearable}
      options={options}
      value={options.filter((option: Option) =>
        (field.value ?? []).includes(option.value)
      )}
      onChange={(values) => {
        helpers.setValue(values.map((x) => x.value));
      }}
    />
  );
};

export default MultiSelectWidget;
