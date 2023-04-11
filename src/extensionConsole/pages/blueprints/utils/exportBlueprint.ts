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

import { isEmpty } from "lodash";
import { type Metadata } from "@/types/registryTypes";

import { isNullOrBlank } from "@/utils";
import GenerateSchema from "generate-schema";
import { isInnerExtensionPoint } from "@/registry/internal";
import { type OptionsArgs } from "@/types/runtimeTypes";
import {
  type OptionsDefinition,
  type UnsavedRecipeDefinition,
} from "@/types/recipeTypes";
import { type Schema } from "@/types/schemaTypes";
import { type UnresolvedExtension } from "@/types/extensionTypes";

/**
 * Infer optionsSchema from the options provided to the extension.
 */
function inferOptionsSchema(optionsArgs: OptionsArgs): OptionsDefinition {
  if (isEmpty(optionsArgs)) {
    return undefined;
  }

  return {
    // The install flow supports passing in an object of properties, or a full schema where the top-level has
    // `type: object` and a `properties` field. The following will output the full schema instead of the short-hand.
    // This avoids a corner-case where we're using the short-hand version but one of the property names is "properties"
    schema: GenerateSchema.json("Mod Options", optionsArgs) as Schema,
  };
}

export function makeBlueprint(
  extension: UnresolvedExtension,
  metadata: Metadata
): UnsavedRecipeDefinition {
  const {
    extensionPointId,
    label,
    // Use v1 for backward compatibility
    apiVersion = "v1",
    templateEngine,
    permissions,
    definitions,
    services,
    optionsArgs,
    config,
  } = extension;

  if (isInnerExtensionPoint(extensionPointId)) {
    throw new Error("Expected unresolved extension");
  }

  return {
    apiVersion,
    kind: "recipe",
    metadata,
    definitions,
    options: inferOptionsSchema(optionsArgs),
    extensionPoints: [
      {
        id: extensionPointId,
        label,
        services: Object.fromEntries(
          services
            .filter((x) => !isNullOrBlank(x.outputKey))
            .map(({ outputKey, id }) => [outputKey, id])
        ),
        templateEngine,
        permissions,
        config,
      },
    ],
  };
}
