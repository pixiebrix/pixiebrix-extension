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

/* eslint-disable security/detect-object-injection -- multiple places use the same constructed key value, not user input */

import { type IntegrationDependency } from "../integrationTypes";
import {
  type IntegrationDependencyVarRef,
  type IntegrationContext,
  type IntegrationContextValue,
} from "../../types/runtimeTypes";
import findSanitizedIntegrationConfigWithRetry from "./findSanitizedIntegrationConfigWithRetry";
import { pickBy } from "lodash";
import { type UUID } from "../../types/stringTypes";
import { type RegistryId } from "../../types/registryTypes";
import { type Nullishable } from "../../utils/nullishUtils";
import { PIXIEBRIX_INTEGRATION_ID } from "../constants";
import { NotConfiguredError } from "../../errors/businessErrors";
import { pixiebrixConfigurationFactory } from "./pixiebrixConfigurationFactory";

async function dependencyContextValue({
  integrationId,
  configId,
}: {
  integrationId: RegistryId;
  configId: UUID;
}): Promise<IntegrationContextValue> {
  // Should be safe to call locateWithRetry in parallel b/c the locator.refresh() method debounces/coalesces
  // the promise
  const integrationConfig = await findSanitizedIntegrationConfigWithRetry(
    integrationId,
    configId,
  );
  return {
    ...pickBy(
      integrationConfig.config,
      // Our JSON validator gets mad at undefined values, and we don't want to include the type brand
      (value, key) => value !== undefined && key !== "_sanitizedConfigBrand",
    ),
    __service: integrationConfig,
  };
}

/** Build the integrations context by locating the dependencies */
export default async function makeIntegrationContextFromDependencies(
  // `ModComponentBase.integrationDependencies` is an optional field. Since we don't have strict-nullness checking on, calls to this method
  // are error-prone. So just be defensive in the signature
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3262
  dependencies: Nullishable<IntegrationDependency[]>,
): Promise<IntegrationContext> {
  const context: IntegrationContext = {};

  if (dependencies == null || dependencies.length === 0) {
    return context;
  }

  for (const dependency of dependencies) {
    const varRef = `@${dependency.outputKey}` as IntegrationDependencyVarRef;

    if (dependency.integrationId === PIXIEBRIX_INTEGRATION_ID) {
      context[varRef] = {
        __service: pixiebrixConfigurationFactory(),
      };
      continue;
    }

    if (!dependency.configId) {
      if (dependency.isOptional) {
        context[varRef] = null;
        continue;
      }

      throw new NotConfiguredError(
        `No configuration selected for ${dependency.integrationId}`,
        dependency.integrationId,
      );
    }

    // eslint-disable-next-line no-await-in-loop -- We need to serialize these calls, because they will attempt to refresh the locator services cache
    context[varRef] = await dependencyContextValue({
      integrationId: dependency.integrationId,
      configId: dependency.configId,
    });
  }

  return context;
}
