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

import { flatten, groupBy, isEmpty, uniqBy } from "lodash";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type IntegrationDependency } from "@/types/integrationTypes";

/**
 * Infer options from existing extension-like instances for reinstalling a recipe
 * @see installRecipe
 */
export function inferRecipeOptions(
  extensions: Array<Pick<ModComponentBase, "optionsArgs">>
): OptionsArgs {
  // For a given recipe, all the extensions receive the same options during the install process (even if they don't
  // use the options), so we can just take the optionsArgs for any of the extensions
  return extensions[0]?.optionsArgs ?? {};
}

/**
 * Infer integration dependencies from existing mod-component-like instances for reinstalling a mod
 * @param modComponents mod components from which to extract integration dependencies
 * @param optional don't check integration dependencies for valid configs
 * @returns IntegrationDependency[] the integration dependencies for the mod components
 * @see installMod
 */
export function inferModIntegrations(
  modComponents: Array<Pick<ModComponentBase, "services">>,
  { optional = false }: { optional?: boolean } = {}
): IntegrationDependency[] {
  // The mod components will only have the integration dependencies that are
  // declared on each extension. So we have to take the union of the integration
  // configs. There's currently no way in the UX that the integration configurations
  // could become inconsistent for a given integration key, but guard against
  // that case anyway.

  const dependenciesByIntegrationId = groupBy(
    modComponents.flatMap((x) => x.services ?? []),
    (x) => x.id
  );
  const result: IntegrationDependency[] = [];
  for (const [id, dependencies] of Object.entries(
    dependenciesByIntegrationId
  )) {
    const configuredDependencies = uniqBy(
      dependencies.filter(({ config }) => config != null),
      ({ config }) => config
    );

    if (
      id !== PIXIEBRIX_INTEGRATION_ID &&
      configuredDependencies.length === 0
    ) {
      if (optional) {
        continue;
      } else {
        // PIXIEBRIX_SERVICE_ID gets the implicit configuration
        throw new Error(`Integration ${id} is not configured`);
      }
    }

    // If optional is passed in, we know that the user is being given an
    // opportunity to switch which configuration is applied, so the user can
    // always switch to a different config if they want.
    if (configuredDependencies.length > 1 && !optional) {
      throw new Error(`Integration ${id} has multiple configurations`);
    }

    result.push(configuredDependencies[0]);
  }

  return result;
}

/**
 * Infer all unique integration dependencies for a recipe
 */
export function inferRecipeDependencies(
  installedRecipeExtensions: ModComponentBase[],
  dirtyRecipeElements: ModComponentFormState[]
): IntegrationDependency[] {
  const withServices: Array<{ services?: IntegrationDependency[] }> = [
    ...installedRecipeExtensions,
    ...dirtyRecipeElements,
  ];
  return uniqBy(
    flatten(withServices.map(({ services }) => services ?? [])),
    JSON.stringify
  );
}
