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

import { useFormikContext } from "formik";
import {
  type IntegrationDependency,
  type SanitizedIntegrationConfig,
} from "@/types/integrationTypes";
import { services } from "@/background/messenger/api";
import { type RegistryId } from "@/types/registryTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import { castArray, uniq } from "lodash";

/**
 * Look up integrations in the current formik context, and return the current
 * sanitized integration config, if the user has selected an auth for the
 * given integrations. If multiple ids are passed in, the intention is that
 * they all apply to the same integration dependency field, and so maximum one
 * matching integration dependency should be found in the formik context. We
 * don't yet support multiple dependencies for the same integration.
 *
 * @param integrationIds The integration ids to look up in the current formik context
 * @returns SanitizedIntegrationConfig for the integration, if the user has selected an integration auth option
 * @throws Error if multiple matching integration dependencies are found
 * @see RequireIntegrationConfig
 */
function useSanitizedIntegrationConfigFormikAdapter(
  integrationIds: RegistryId | RegistryId[]
): FetchableAsyncState<SanitizedIntegrationConfig | null> {
  const idArray = uniq(castArray(integrationIds));
  const {
    values: { integrationDependencies = [] },
  } = useFormikContext<{ integrationDependencies: IntegrationDependency[] }>();
  const matchingIntegrationDependencies = integrationDependencies.filter(
    ({ integrationId }) => idArray.includes(integrationId)
  );
  if (matchingIntegrationDependencies.length > 1) {
    throw new Error("Multiple matching integrations configured");
  }

  const integrationDependency = matchingIntegrationDependencies[0];
  return useAsyncState(async () => {
    if (!integrationDependency) {
      return null;
    }

    const { integrationId, configId } = integrationDependency;
    return services.locate(integrationId, configId);
  }, [integrationDependency]);
}

export default useSanitizedIntegrationConfigFormikAdapter;
