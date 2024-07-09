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

import { isEmpty } from "lodash";
import { type Metadata, DefinitionKinds } from "@/types/registryTypes";
import GenerateSchema from "generate-schema";
import { type OptionsArgs } from "@/types/runtimeTypes";
import {
  type ModComponentDefinition,
  type ModOptionsDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { type Schema } from "@/types/schemaTypes";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { isNullOrBlank } from "@/utils/stringUtils";

/**
 * Infer optionsSchema from the options provided to the extension.
 */
function inferOptionsSchema(
  optionsArgs: OptionsArgs | undefined,
): ModOptionsDefinition | undefined {
  if (isEmpty(optionsArgs)) {
    return undefined;
  }

  return {
    // The activation flow supports passing in an object of properties, or a full schema where the top-level has
    // `type: object` and a `properties` field. The following will output the full schema instead of the shorthand.
    // This avoids a corner-case where we're using the shorthand version but one of the property names is "properties"
    schema: GenerateSchema.json("Mod Options", optionsArgs) as Schema,
  };
}

function mapModComponentToModDefinition(
  modComponent: SerializedModComponent,
  metadata: Metadata,
): UnsavedModDefinition {
  const {
    extensionPointId,
    label,
    // Use v1 for backward compatibility
    apiVersion = "v1",
    templateEngine,
    permissions,
    definitions,
    integrationDependencies,
    optionsArgs,
    config,
  } = modComponent;

  if (isInnerDefinitionRegistryId(extensionPointId)) {
    throw new Error("Expected UnresolvedExtension");
  }

  const modComponentDefinition: ModComponentDefinition = {
    id: extensionPointId,
    label,
    templateEngine,
    permissions,
    config,
  };
  if (integrationDependencies) {
    modComponentDefinition.services = Object.fromEntries(
      integrationDependencies
        .filter(({ outputKey }) => !isNullOrBlank(outputKey))
        .map(({ outputKey, integrationId }) => [outputKey, integrationId]),
    );
  }

  const modDefinition: UnsavedModDefinition = {
    apiVersion,
    kind: DefinitionKinds.MOD,
    metadata,
    definitions,
    extensionPoints: [modComponentDefinition],
  };

  const options = inferOptionsSchema(optionsArgs);
  if (options) {
    modDefinition.options = options;
  }

  return modDefinition;
}

export default mapModComponentToModDefinition;
