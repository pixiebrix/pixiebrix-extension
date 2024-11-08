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

import type { SanitizedIntegrationConfig } from "../../../integrations/integrationTypes";
import type { Option } from "./SelectWidget";
import type { FetchableAsyncState } from "../../../types/sliceTypes";
import useAsyncState from "@/hooks/useAsyncState";
import isPromise from "is-promise";
import { BusinessError } from "@/errors/businessErrors";
import { type OptionsFactory } from "./RemoteSelectWidget";

export function useOptionsResolver<T>(
  config: SanitizedIntegrationConfig | null,
  optionsFactory: OptionsFactory<T> | Promise<Array<Option<T>>>,
  factoryArgs?: UnknownObject,
): FetchableAsyncState<Array<Option<T>>> {
  return useAsyncState<Array<Option<T>>>(async () => {
    if (isPromise(optionsFactory)) {
      return optionsFactory;
    }

    if (config) {
      return optionsFactory(config, factoryArgs);
    }

    throw new BusinessError("No integration configured");
  }, [config, optionsFactory, factoryArgs]);
}
