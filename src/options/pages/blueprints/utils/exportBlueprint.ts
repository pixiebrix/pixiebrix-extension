/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import {
  Metadata,
  RegistryId,
  Schema,
  UnresolvedExtension,
  UserOptions,
} from "@/core";
import { objToYaml } from "@/utils/objToYaml";
import { saveAs } from "file-saver";
import {
  OptionsDefinition,
  UnsavedRecipeDefinition,
} from "@/types/definitions";
import { isNullOrBlank } from "@/utils";
import GenerateSchema from "generate-schema";
import { isInnerExtensionPoint } from "@/registry/internal";
import filenamify from "filenamify";

/**
 * Infer optionsSchema from the options provided to the extension.
 */
export function inferOptionsSchema(
  optionsArgs: UserOptions
): OptionsDefinition {
  if (isEmpty(optionsArgs)) {
    return undefined;
  }

  return {
    // The install flow supports passing in an object of properties, or a full schema where the top-level has
    // `type: object` and a `properties` field. The following will output the full schema instead of the short-hand.
    // This avoids a corner-case where we're using the short-hand version but one of the property names is "properties"
    schema: GenerateSchema.json("Blueprint Options", optionsArgs) as Schema,
  };
}

export function makeBlueprint(
  extension: UnresolvedExtension,
  metadata: Metadata
): UnsavedRecipeDefinition {
  const {
    extensionPointId,
    label,
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

export function exportBlueprint(extension: UnresolvedExtension): void {
  const blueprint = makeBlueprint(extension, {
    id: "" as RegistryId,
    name: extension.label,
    description: "Blueprint exported from PixieBrix",
    version: "1.0.0",
  });

  const blueprintYAML = objToYaml(blueprint);
  const blob = new Blob([blueprintYAML], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filenamify([extension.label, ".yaml"].join(".")));
}
