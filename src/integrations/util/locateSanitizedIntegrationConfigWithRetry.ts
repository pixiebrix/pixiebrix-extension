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

import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { services } from "@/background/messenger/api";
import { isSpecificError } from "@/errors/errorHelpers";
import { MissingConfigurationError } from "@/errors/businessErrors";
import { memoizeUntilSettled } from "@/utils/promiseUtils";

async function _locateWithRetry(
  integrationId: RegistryId,
  authId: UUID,
  { retry = true }: { retry: boolean },
): Promise<SanitizedIntegrationConfig> {
  try {
    return await services.locate(integrationId, authId);
  } catch (error) {
    if (retry && isSpecificError(error, MissingConfigurationError)) {
      // Retry
    } else {
      throw error;
    }
  }

  // Ensure the locator has the latest configurations (remote and local)
  await services.refresh();

  return services.locate(integrationId, authId);
}

/**
 * Locate an integration config by id and configuration. If it's not found,
 * fetch the latest configurations from local storage and remote, and then
 * try again.
 */
// Memoize until settled, because multiple elements on the screen may be
// trying to locate the same integration. Might also consider full
// memoization/caching, but would have to be careful about invalidating the
// cache on integration configuration changes
const locateSanitizedIntegrationConfigWithRetry = memoizeUntilSettled(
  _locateWithRetry,
  {
    cacheKey: JSON.stringify,
  },
);

export default locateSanitizedIntegrationConfigWithRetry;
