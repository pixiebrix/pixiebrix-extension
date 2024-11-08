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

import { type ModDefinition } from "../../types/modDefinitionTypes";
import { type RegistryId } from "../../types/registryTypes";
import { isEmpty, uniq } from "lodash";
import { isSchemaServicesFormat } from "../../modDefinitions/util/isSchemaServicesFormat";
import extractIntegrationIdsFromSchema from "./extractIntegrationIdsFromSchema";
import { type Schema } from "../../types/schemaTypes";
import { PIXIEBRIX_INTEGRATION_ID } from "../constants";

/**
 * Return an array of unique integration ids used by a mod definition or another collection of mod components
 * @param extensionPoints mod component definitions from which to extract integration ids
 * @param excludePixieBrix whether to exclude the PixieBrix integration
 * @param requiredOnly whether to only include required integrations
 */
export default function getModDefinitionIntegrationIds(
  {
    extensionPoints: modComponentDefinitions = [],
  }: Pick<ModDefinition, "extensionPoints">,
  { excludePixieBrix = false, requiredOnly = false } = {},
): RegistryId[] {
  const integrationIds = uniq(
    modComponentDefinitions.flatMap(({ services }) => {
      if (isEmpty(services)) {
        return [];
      }

      return isSchemaServicesFormat(services)
        ? Object.entries(services.properties ?? {})
            .filter(
              ([key]) => !requiredOnly || services.required?.includes(key),
            )
            .flatMap(([, schema]) =>
              extractIntegrationIdsFromSchema(schema as Schema),
            )
        : Object.values(services ?? {});
    }),
  );

  if (excludePixieBrix) {
    return integrationIds.filter((id) => id !== PIXIEBRIX_INTEGRATION_ID);
  }

  return integrationIds;
}
