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
import { useField } from "formik";
import Select from "react-select";
import { type Option } from "@/components/form/widgets/SelectWidget";
import { type SanitizedServiceConfiguration } from "@/core";
import {
  type OptionsFactory,
  useOptionsResolver,
} from "@/components/form/widgets/RemoteSelectWidget";
import { getErrorMessage } from "@/errors/errorHelpers";
import useReportError from "@/hooks/useReportError";
import { type UnknownObject } from "@/types";

type RemoteMultiSelectWidgetProps = {
  id?: string;
  name: string;
  disabled?: boolean;
  isClearable?: boolean;
  optionsFactory: OptionsFactory | Promise<Array<Option<unknown>>>;
  config: SanitizedServiceConfiguration | null;
  /**
   * Additional arguments to pass to optionsFactory, if optionsFactory is a function.
   */
  factoryArgs?: UnknownObject;
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
  factoryArgs,
  config,
  ...props
}) => {
  const [field, , helpers] = useField<unknown[]>(props);
  const [options, isLoading, loadError] = useOptionsResolver(
    config,
    optionsFactory,
    factoryArgs
  );
  useReportError(loadError);

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
