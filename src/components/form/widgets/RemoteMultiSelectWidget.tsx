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
import { Option } from "@/components/form/widgets/SelectWidget";
import { SanitizedServiceConfiguration } from "@/core";
import {
  OptionsFactory,
  useOptionsResolver,
} from "@/components/form/widgets/RemoteSelectWidget";
import { getErrorMessage } from "@/errors";

type RemoteMultiSelectWidgetProps = {
  id?: string;
  name: string;
  disabled?: boolean;
  isClearable?: boolean;
  optionsFactory: OptionsFactory | Promise<Array<Option<unknown>>>;
  config: SanitizedServiceConfiguration | null;
  loadingMessage?: string;
};

/**
 * @see RemoteSelectWidget
 */
const RemoteMultiSelectWidget: React.FC<RemoteMultiSelectWidgetProps> = ({
  id,
  isClearable = false,
  disabled,
  optionsFactory,
  config,
  ...props
}) => {
  const [field, , helpers] = useField<unknown[]>(props);
  const [options, isLoading, loadError] = useOptionsResolver(
    config,
    optionsFactory
  );

  if (loadError) {
    return (
      <div className="text-danger">
        Error loading options: {getErrorMessage(loadError)}
      </div>
    );
  }

  return (
    <Select
      inputId={id}
      isMulti
      isDisabled={disabled}
      isClearable={isClearable}
      options={options ?? []}
      isLoading={isLoading}
      value={
        options?.filter((option: Option) =>
          (field.value ?? []).includes(option.value)
        ) ?? []
      }
      onChange={(options) => {
        helpers.setValue(options.map((option) => option.value));
      }}
    />
  );
};

export default RemoteMultiSelectWidget;
