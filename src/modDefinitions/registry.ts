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

import BaseRegistry from "@/registry/memoryRegistry";
import { propertiesToSchema } from "@/validators/generic";
import produce from "immer";
import { sortBy } from "lodash";
import {
  type Schema,
  type SchemaProperties,
  type UiSchema,
} from "@/types/schemaTypes";
import {
  type ModOptionsDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import { type RegistryId } from "@/types/registryTypes";

type UnnormalizedOptionsDefinition = {
  schema: Schema | SchemaProperties;
  uiSchema?: UiSchema;
};

type UnnormalizedModDefinition = Exclude<ModDefinition, "options"> & {
  options?: UnnormalizedOptionsDefinition;
};

type RegistryModDefinition = ModDefinition & {
  id: RegistryId;
};

/**
 * Fix hand-crafted mod options from the workshop
 */
function normalizeModOptions(
  options?: ModOptionsDefinition,
): ModOptionsDefinition {
  if (options == null) {
    return {
      schema: {},
      uiSchema: {},
    };
  }

  const modDefinitionSchema = options.schema ?? {};
  const schema: Schema =
    "type" in modDefinitionSchema &&
    modDefinitionSchema.type === "object" &&
    "properties" in modDefinitionSchema
      ? modDefinitionSchema
      : propertiesToSchema(modDefinitionSchema as SchemaProperties);
  const uiSchema: UiSchema = options.uiSchema ?? {};
  uiSchema["ui:order"] = uiSchema["ui:order"] ?? [
    ...sortBy(Object.keys(schema.properties ?? {})),
    "*",
  ];
  return { schema, uiSchema };
}

function fromJS(rawModDefinition: UnnormalizedModDefinition) {
  return produce(rawModDefinition, (draft: RegistryModDefinition) => {
    draft.options = normalizeModOptions(rawModDefinition.options);
    draft.id = rawModDefinition.metadata.id;
  }) as RegistryModDefinition;
}

const registry = new BaseRegistry<RegistryId, RegistryModDefinition>(
  ["recipe"],
  fromJS,
);

export default registry;
