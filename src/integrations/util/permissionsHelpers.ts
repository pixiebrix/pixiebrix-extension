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

import { type Permissions } from "webextension-polyfill";
import serviceRegistry from "@/integrations/registry";
import { expectContext } from "@/utils/expectContext";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import findSanitizedIntegrationConfigWithRetry from "@/integrations/util/findSanitizedIntegrationConfigWithRetry";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Return origin permissions required to use an integration with the given configuration.
 */
export async function collectIntegrationOriginPermissions({
  integrationId,
  configId,
}: Pick<
  IntegrationDependency,
  "integrationId" | "configId"
>): Promise<Permissions.Permissions> {
  expectContext("extension");

  if (integrationId === PIXIEBRIX_INTEGRATION_ID) {
    // Already included in the required permissions for the extension
    return { origins: [] };
  }

  assertNotNullish(
    configId,
    "configId is required for non-pixiebrix integrations",
  );

  const localConfig = await findSanitizedIntegrationConfigWithRetry(
    integrationId,
    configId,
  );

  if (localConfig.proxy) {
    // Don't need permissions to access the pixiebrix API proxy server because they're already granted on
    // extension install. The proxy server will check isAvailable when making request
    return { origins: [] };
  }

  const integration = await serviceRegistry.lookup(integrationId);
  const origins = integration.getOrigins(localConfig.config);
  return { origins };
}
