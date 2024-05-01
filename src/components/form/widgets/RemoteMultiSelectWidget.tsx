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

import React, { type ChangeEvent, useEffect } from "react";
import Select, { type MultiValue } from "react-select";
import {
  type MultiSelectLike,
  type Option,
} from "@/components/form/widgets/SelectWidget";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import {
  type OptionsFactory,
  useOptionsResolver,
} from "@/components/form/widgets/RemoteSelectWidget";
import { getErrorMessage } from "@/errors/errorHelpers";
import useReportError from "@/hooks/useReportError";
import type { CustomFieldWidgetProps } from "@/components/form/FieldTemplate";

type RemoteMultiSelectWidgetProps<TOption extends Option<TOption["value"]>> =
  CustomFieldWidgetProps<Array<TOption["value"]>, MultiSelectLike<TOption>> & {
    isClearable?: boolean;
    optionsFactory: OptionsFactory<TOption["value"]> | Promise<TOption[]>;
    config: SanitizedIntegrationConfig | null;
    /**
     * Additional arguments to pass to optionsFactory, if optionsFactory is a function.
     */
    factoryArgs?: UnknownObject;
  };

/**
 * @see RemoteSelectWidget
 */
const RemoteMultiSelectWidget = <TOption extends Option<TOption["value"]>>({
  id,
  isClearable = false,
  disabled,
  value,
  optionsFactory,
  config,
  factoryArgs,
  onChange,
  setLocalError,
  ...selectProps
}: RemoteMultiSelectWidgetProps<TOption>) => {
  const {
    data: options = [],
    isLoading,
    error,
  } = useOptionsResolver(config, optionsFactory, factoryArgs);

  useReportError(error);

  useEffect(() => {
    if (error == null) {
      setLocalError?.(null);
    } else {
      setLocalError?.(getErrorMessage(error, "Error loading options"));
    }
  }, [error, setLocalError]);

  // Option will be null when the select is "cleared"
  const patchedOnChange = (newOptions: MultiValue<TOption>) => {
    onChange({
      target: {
        value: newOptions.map(({ value }) => value),
        name: selectProps.name,
        options,
      },
    } as ChangeEvent<MultiSelectLike<TOption>>);
  };

  const selectedOptions = options.filter((option: Option) =>
    value.includes(option.value),
  );

  return (
    <Select
      inputId={id}
      isMulti
      isDisabled={disabled}
      options={options}
      isLoading={isLoading}
      value={selectedOptions}
      onChange={patchedOnChange}
      {...selectProps}
    />
  );
};

export default RemoteMultiSelectWidget;
