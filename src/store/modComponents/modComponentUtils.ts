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

import { uniqBy } from "lodash";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";

/**
 * Infer options args from existing mod-component-like instances for reinstalling a mod
 */
export function collectModOptions(
  modComponents: Array<Pick<ModComponentBase, "optionsArgs">>,
): OptionsArgs {
  // For a given mod, all the components receive the same options during the
  // activation process (even if they don't use the options), so we can take
  // the optionsArgs for any of the extensions
  return modComponents[0]?.optionsArgs ?? {};
}

/**
 * Collect configured integration dependencies from existing mod-component-like
 * instances for reinstalling a mod. Filters out any optional integrations that
 * don't have a config set.
 * @param modComponents mod components from which to extract integration dependencies
 * @returns IntegrationDependency[] the configured integration dependencies for the mod components
 */
export function collectConfiguredIntegrationDependencies(
  modComponents: Array<Pick<ModComponentBase, "integrationDependencies">>,
): IntegrationDependency[] {
  return uniqBy(
    modComponents
      .flatMap(({ integrationDependencies }) => integrationDependencies ?? [])
      .filter(
        ({ integrationId, configId }) =>
          configId != null || integrationId === PIXIEBRIX_INTEGRATION_ID,
      ),
    ({ integrationId }) => integrationId,
  );
}
