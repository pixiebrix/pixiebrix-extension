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

import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { type ServiceContext } from "@/types/runtimeTypes";
import locateSanitizedIntegrationConfigWithRetry from "@/integrations/util/locateSanitizedIntegrationConfigWithRetry";
import { pickBy } from "lodash";
import { resolveObj } from "@/utils/promiseUtils";

export const SERVICES_BASE_SCHEMA_URL =
  "https://app.pixiebrix.com/schemas/services/";

/** Build the service context by locating the dependencies */
export default async function makeServiceContextFromDependencies(
  // `ModComponentBase.integrationDependencies` is an optional field. Since we don't have strict-nullness checking on, calls to this method
  // are error-prone. So just be defensive in the signature
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3262
  dependencies: IntegrationDependency[] | null = []
): Promise<ServiceContext> {
  const dependencyContext = async ({
    integrationId,
    configId,
  }: IntegrationDependency) => {
    // Should be safe to call locateWithRetry in parallel b/c the locator.refresh() method debounces/coalesces
    // the promise
    const integrationConfig = await locateSanitizedIntegrationConfigWithRetry(
      integrationId,
      configId,
      {
        retry: true,
      }
    );
    return {
      // Our JSON validator gets mad at undefined values
      ...pickBy(integrationConfig.config, (x) => x !== undefined),
      __service: integrationConfig,
    };
  };

  return resolveObj(
    Object.fromEntries(
      dependencies.map((dependency) => {
        const context =
          dependency.isOptional && !dependency.configId
            ? null
            : dependencyContext(dependency);

        return [`@${dependency.outputKey}`, context];
      })
    )
  );
}
