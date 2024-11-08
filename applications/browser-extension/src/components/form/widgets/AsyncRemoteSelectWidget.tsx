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

import React, {
  type ChangeEvent,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  type Option,
  type SelectLike,
} from "./SelectWidget";
import AsyncSelect, { type AsyncProps } from "react-select/async";
import { type CustomFieldWidgetProps } from "../FieldTemplate";
import { uniqBy } from "lodash";
import { getErrorMessage } from "../../../errors/errorHelpers";
import { useDebouncedCallback } from "use-debounce";
import { type GroupBase } from "react-select";
import FieldTemplateLocalErrorContext from "./FieldTemplateLocalErrorContext";
import useIsMounted from "../../../hooks/useIsMounted";

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
  TValue = unknown,
> = (factoryArgs?: Args) => Promise<Array<Option<TValue>>>;

export type AsyncRemoteSelectWidgetProps<
  ExtraArgs extends UnknownObject = UnknownObject,
  TValue = unknown,
> = CustomFieldWidgetProps<TValue, SelectLike<Option<TValue>>> & {
  optionsFactory: AsyncOptionsFactory<DefaultFactoryArgs & ExtraArgs, TValue>;
  extraFactoryArgs?: ExtraArgs;
  unknownOptionLabel?: (value: TValue) => string;
} & Pick<
    AsyncProps<Option<TValue>, false, GroupBase<Option<TValue>>>,
    | "isClearable"
    | "placeholder"
    | "defaultOptions"
    | "loadingMessage"
    | "noOptionsMessage"
  >;

// See: react-select Props --> loadingMessage, noOptionsMessage
export type AsyncSelectStatusMessage = React.FC<{ inputValue: string }>;

/**
 * Widget for selecting values retrieved from a 3rd party API based on the user query.
 *
 * See `react-select` documentation for prop usage: https://react-select.com/async
 *
 * @since 1.7.20
 * @see RemoteSelectWidget
 */
const AsyncRemoteSelectWidget: React.FC<AsyncRemoteSelectWidgetProps> = ({
  name,
  value,
  onChange,
  optionsFactory,
  extraFactoryArgs,
  unknownOptionLabel,
  isInvalid,
  ...asyncSelectPropsIn
}) => {
  const [knownOptions, setKnownOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMounted = useIsMounted();

  const setOptions = useCallback(
    (options: Option[], reactSelectCallback: (options: Option[]) => void) => {
      setKnownOptions((prev) => uniqBy([...prev, ...options], (x) => x.value));
      reactSelectCallback(options);
    },
    [],
  );

  const { setLocalError } = useContext(FieldTemplateLocalErrorContext);

  // `react-select` doesn't automatically debounce requests
  // See quirks here: https://github.com/JedWatson/react-select/issues/3075#issuecomment-506647171
  // Need to use callback and ensure that the callback is not returning a promise
  const loadOptions = useDebouncedCallback(
    (query: string, callback: (options: Option[]) => void) => {
      const generate = async () => {
        try {
          const rawOptions = (await optionsFactory({
            ...extraFactoryArgs,
            query,
            value,
          })) as Option[];

          if (!isMounted()) {
            return;
          }

          setOptions(rawOptions, callback);
          setLocalError(null);
        } catch (error) {
          if (!isMounted()) {
            return;
          }

          setOptions([], callback);
          setLocalError(getErrorMessage(error, "Error loading options"));
        } finally {
          if (isMounted()) {
            setIsLoading(false);
          }
        }
      };

      // Ensure we're not returning a promise because we're using the callback
      void generate();
    },
    150,
    { leading: false, trailing: true, maxWait: 750 },
  );

  // Option will be null when the select is "cleared"
  const patchedOnChange = (option: Option | null) => {
    onChange({
      // Force conversion from undefined to null
      target: { value: option?.value ?? null, name },
    } as ChangeEvent<SelectLike>);
  };

  // Pass null instead of undefined if options is not defined
  let selectedOption: Option<unknown> | null = null;
  const knownOption = knownOptions?.find(
    (option: Option) => value === option.value,
  );
  if (knownOption) {
    selectedOption = knownOption;
  } else if (value) {
    const label = isLoading
      ? "Loading..."
      : unknownOptionLabel
        ? unknownOptionLabel(value)
        : `Unknown option: ${String(value)}`;
    selectedOption = { value, label };
  }

  const { placeholder, ...asyncSelectProps } = asyncSelectPropsIn;

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <AsyncSelect
          name={name}
          loadOptions={loadOptions}
          onChange={patchedOnChange}
          value={selectedOption}
          placeholder={isInvalid ? "" : placeholder}
          {...asyncSelectProps}
        />
      </div>
    </div>
  );
};

export default AsyncRemoteSelectWidget;
