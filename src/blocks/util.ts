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

import { type IBlock, type RegistryId, type Schema } from "@/core";
import { type UnknownObject } from "@/types";
import { castArray, mapValues, pickBy } from "lodash";
import { removeUndefined } from "@/utils";
import { type BlockConfig, type BlockPipeline } from "@/blocks/types";
import { PipelineConfigurationError } from "@/blocks/errors";
import blockRegistry from "@/blocks/registry";
import pipelineSchema from "@schemas/pipeline.json";

export function isOfficial(id: RegistryId): boolean {
  return id.startsWith("@pixiebrix/");
}

/**
 * Returns the initial state for a blockConfig.
 * @param schema the JSON Schema
 */
export function defaultBlockConfig(schema: Schema): UnknownObject {
  if (typeof schema.properties === "object") {
    return removeUndefined(
      mapValues(
        pickBy(
          schema.properties,
          (x) =>
            typeof x !== "boolean" &&
            ((x.default && !x.anyOf && !x.oneOf) ||
              x.$ref === pipelineSchema.$id)
        ),
        (propertySchema: Schema) => {
          if (propertySchema.$ref === pipelineSchema.$id) {
            return {
              __type__: "pipeline",
              __value__: [],
            };
          }

          if (typeof propertySchema.default !== "object") {
            return propertySchema.default;
          }
        }
      )
    ) as UnknownObject;
  }

  return {};
}

/** Return block definitions for all blocks referenced in a pipeline */
export async function blockList(
  config: BlockConfig | BlockPipeline
): Promise<IBlock[]> {
  return Promise.all(
    castArray(config).map(async ({ id }) => {
      if (id == null) {
        throw new PipelineConfigurationError(
          "Pipeline stage is missing a block id",
          config
        );
      }

      return blockRegistry.lookup(id);
    })
  );
}
