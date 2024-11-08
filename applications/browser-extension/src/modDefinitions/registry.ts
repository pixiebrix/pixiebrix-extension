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

import BaseRegistry from "@/registry/memoryRegistry";
import produce from "immer";
import {
  type Schema,
  type SchemaProperties,
  type UiSchema,
} from "@/types/schemaTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type RegistryId } from "@/types/registryTypes";
import { normalizeModOptionsDefinition } from "@/utils/modUtils";

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

function fromJS(rawModDefinition: UnnormalizedModDefinition) {
  return produce(rawModDefinition, (draft: RegistryModDefinition) => {
    draft.options = normalizeModOptionsDefinition(rawModDefinition.options);
    draft.id = rawModDefinition.metadata.id;
  }) as RegistryModDefinition;
}

const registry = new BaseRegistry<RegistryId, RegistryModDefinition>(
  ["recipe"],
  fromJS,
);

export default registry;
