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

import { type Permissions } from "webextension-polyfill";
import serviceRegistry from "@/services/registry";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { locateWithRetry } from "@/services/serviceUtils";
import { expectContext } from "@/utils/expectContext";
import { type ServiceAuthPair } from "@/types/serviceTypes";

/**
 * Return origin permissions required to use a service with the given configuration.
 */
export async function collectServiceOriginPermissions(
  dependency: ServiceAuthPair
): Promise<Permissions.Permissions> {
  expectContext("extension");

  if (dependency.id === PIXIEBRIX_SERVICE_ID) {
    // Already included in the required permissions for the extension
    return { origins: [] };
  }

  const localConfig = await locateWithRetry(dependency.id, dependency.config, {
    retry: true,
  });

  if (localConfig.proxy) {
    // Don't need permissions to access the pixiebrix API proxy server because they're already granted on
    // extension install. The proxy server will check isAvailable when making request
    return { origins: [] };
  }

  const service = await serviceRegistry.lookup(dependency.id);
  const origins = service.getOrigins(localConfig.config);
  return { origins };
}
