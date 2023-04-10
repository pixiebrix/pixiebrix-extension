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
import {
  type Option,
  type SelectLike,
} from "@/components/form/widgets/SelectWidget";
import { type SanitizedServiceConfiguration } from "@/types/serviceTypes";
import AsyncSelect from "react-select/async";
import { type CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import { type UnknownObject } from "@/types/objectTypes";
import { uniqBy } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";
import { useDebouncedCallback } from "use-debounce";

type DefaultFactoryArgs = {
  /**
   * The current user-provided query.
   */
  query: string;
  /**
   * The currently selected value, or null if a value is not selected.
   */
  value: unknown;
};

export type AsyncOptionsFactory<
  Args extends DefaultFactoryArgs = DefaultFactoryArgs,
  T = unknown
> = (
  config: SanitizedServiceConfiguration,
  factoryArgs?: Args
) => Promise<Array<Option<T>>>;

type AsyncRemoteSelectWidgetProps<
  Args extends DefaultFactoryArgs = DefaultFactoryArgs,
  T = unknown
> = CustomFieldWidgetProps<T, SelectLike<Option<T>>> & {
  isClearable?: boolean;
  optionsFactory: AsyncOptionsFactory<Args, T>;
  config: SanitizedServiceConfiguration | null;
  factoryArgs?: UnknownObject;
  loadingMessage?: React.FC<{ inputValue: string }>;
  defaultOptions?: boolean | Array<Option<T>>;
};

/**
 * Widget for selecting values retrieved from a 3rd party API based on the user query.
 *
 * See `react-select` documentation for prop usage: https://react-select.com/async
 *
 * @since 1.7.20
 * @see RemoteSelectWidget
 */
const AsyncRemoteSelectWidget: React.FC<AsyncRemoteSelectWidgetProps> = ({
  config,
  optionsFactory,
  factoryArgs,
  onChange,
  name,
  value,
  ...selectProps
}) => {
  const [knownOptions, setKnownOptions] = useState<Option[]>([]);

  // `react-select` doesn't automatically debounce requests
  // See quirks here: https://github.com/JedWatson/react-select/issues/3075#issuecomment-506647171
  // Need to use callback and ensure that the callback is not returning a promise
  const loadOptions = useDebouncedCallback(
    (query: string, callback: (options: Option[]) => void) => {
      const generate = async () => {
        try {
          const rawOptions = (await optionsFactory(config, {
            ...factoryArgs,
            query,
            value,
          })) as Option[];

          if (Array.isArray(rawOptions)) {
            setKnownOptions((prev) =>
              uniqBy([...prev, ...rawOptions], (x) => x.value)
            );
          } else {
            // Throw locally, to translate into error for AsyncSelect
            console.error(
              `Expected array of options, got ${typeof rawOptions}`,
              rawOptions
            );
            throw new TypeError(
              `Expected array of options, got ${typeof rawOptions}`
            );
          }

          callback(rawOptions);
        } catch (error) {
          // Return options to AsyncSelect, but do not cache in local knownOptions
          // `react-select` doesn't have native support for error in AsyncSelect :shrug:
          // https://github.com/JedWatson/react-select/issues/1528
          callback([
            {
              value: "error",
              label: getErrorMessage(error, "Error loading options"),
              isDisabled: true,
              // `isDisabled` is not on the type definition, but it is supported
            } as Option,
          ]);
        }
      };

      // Ensure we're not returning a promise because we're using the callback
      void generate();
    },
    150,
    { leading: false, trailing: true, maxWait: 750 }
  );

  // Option will be null when the select is "cleared"
  const patchedOnChange = (option: Option | null) => {
    onChange({
      // Force conversion from undefined to null
      target: { value: option?.value ?? null, name },
    } as ChangeEvent<SelectLike>);
  };

  // Pass null instead of undefined if options is not defined
  const selectedOption =
    knownOptions?.find((option: Option) => value === option.value) ??
    // Not great UX, if the result is not in the default options, we'll just show the value
    // instead of the label.
    (value ? { value, label: value } : null);

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <AsyncSelect
          name={name}
          loadOptions={loadOptions}
          onChange={patchedOnChange}
          value={selectedOption}
          {...selectProps}
        />
      </div>
    </div>
  );
};

export default AsyncRemoteSelectWidget;
