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

import React, { useContext, useEffect } from "react";
import SelectWidget, {
  type Option,
  type SelectLike,
} from "@/components/form/widgets/SelectWidget";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import isPromise from "is-promise";
import useReportError from "@/hooks/useReportError";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { getErrorMessage } from "@/errors/errorHelpers";
import { useOptionsResolver } from "@/components/form/widgets/useOptionsResolver";
import FieldTemplateLocalErrorContext from "@/components/form/widgets/FieldTemplateLocalErrorContext";

export type OptionsFactory<T = unknown> = (
  config: SanitizedIntegrationConfig,
  factoryArgs?: UnknownObject,
) => Promise<Array<Option<T>>>;

type RemoteSelectWidgetProps<T = unknown> = CustomFieldWidgetProps<
  T,
  SelectLike<Option<T>>
> & {
  isClearable?: boolean;
  optionsFactory: OptionsFactory<T> | Promise<Array<Option<T>>>;
  config: SanitizedIntegrationConfig | null;
  /**
   * Additional arguments to pass to optionsFactory, if optionsFactory is a function.
   */
  factoryArgs?: UnknownObject;
  loadingMessage?: string;
};

/**
 * Widget for selecting values retrieved from a 3rd party API
 * @see AsyncRemoteSelectWidget
 */
const RemoteSelectWidget: React.FC<RemoteSelectWidgetProps> = ({
  optionsFactory,
  config,
  factoryArgs,
  ...selectProps
}) => {
  const {
    data: options,
    isLoading,
    error,
    refetch: refreshOptions,
  } = useOptionsResolver(config, optionsFactory, factoryArgs);

  useReportError(error);

  const { setLocalError } = useContext(FieldTemplateLocalErrorContext);

  useEffect(() => {
    if (error == null) {
      setLocalError(null);
    } else {
      setLocalError(getErrorMessage(error, "Error loading options"));
    }
  }, [error, setLocalError]);

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <SelectWidget
          options={options}
          isLoading={isLoading}
          {...selectProps}
        />
      </div>

      {!isPromise(optionsFactory) && (
        <div>
          <Button onClick={refreshOptions} variant="info" title="Refresh">
            <FontAwesomeIcon icon={faSync} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RemoteSelectWidget;
