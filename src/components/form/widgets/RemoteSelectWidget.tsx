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
import SelectWidget, { Option } from "@/components/form/widgets/SelectWidget";
import { SanitizedServiceConfiguration } from "@/core";
import { useAsyncState } from "@/hooks/common";
import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import { BusinessError } from "@/errors";

export type OptionsFactory = (
  config: SanitizedServiceConfiguration
) => Promise<Option[]>;

type OwnProps = {
  isClearable?: boolean;
  optionsFactory: OptionsFactory;
  config: SanitizedServiceConfiguration | null;
  loadingMessage?: string;
};

/**
 * Widget for selecting values retrieved from a 3rd party API
 */
const RemoteSelectWidget: CustomFieldWidget<OwnProps> = ({
  config,
  optionsFactory,
  ...selectProps
}) => {
  const [options, isLoading, error] = useAsyncState(async () => {
    if (config) {
      return optionsFactory(config);
    }

    throw new BusinessError("No integration configured");
  }, [config, optionsFactory]);

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
