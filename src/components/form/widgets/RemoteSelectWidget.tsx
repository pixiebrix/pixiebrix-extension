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
import SelectWidget, {
  Option,
  SelectLike,
} from "@/components/form/widgets/SelectWidget";
import { SanitizedServiceConfiguration } from "@/core";
import { AsyncState, useAsyncState } from "@/hooks/common";
import { CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import { BusinessError } from "@/errors";
import isPromise from "is-promise";

export type OptionsFactory<T = unknown> = (
  config: SanitizedServiceConfiguration
) => Promise<Array<Option<T>>>;

type RemoteSelectWidgetProps<T = unknown> = CustomFieldWidgetProps<
  T,
  SelectLike<Option<T>>
> & {
  isClearable?: boolean;
  optionsFactory: OptionsFactory<T> | Promise<Array<Option<T>>>;
  config: SanitizedServiceConfiguration | null;
  loadingMessage?: string;
};

export function useOptionsResolver<T>(
  config: SanitizedServiceConfiguration,
  optionsFactory: OptionsFactory<T> | Promise<Array<Option<T>>>
): AsyncState<Array<Option<T>>> {
  return useAsyncState<Array<Option<T>>>(async () => {
    if (isPromise(optionsFactory)) {
      console.debug("Options is a promise, returning promise directly");
      return optionsFactory;
    }

    if (config) {
      console.debug("Options is a factory, fetching options with config", {
        config,
      });
      return optionsFactory(config);
    }

    throw new BusinessError("No integration configured");
  }, [config, optionsFactory]);
}

/**
 * Widget for selecting values retrieved from a 3rd party API
 */
const RemoteSelectWidget: React.FC<RemoteSelectWidgetProps> = ({
  config,
  optionsFactory,
  ...selectProps
}) => {
  const [options, isLoading, error] = useOptionsResolver(
    config,
    optionsFactory
  );

  return (
    <SelectWidget
      options={options}
      isLoading={isLoading}
      loadError={error}
      {...selectProps}
    />
  );
};

export default RemoteSelectWidget;
