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

import { mapValues, pickBy } from "lodash";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import brickRegistry from "@/bricks/registry";
import pipelineSchema from "@schemas/pipeline.json";
import { type RegistryId } from "@/types/registryTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Brick } from "@/types/brickTypes";
import BrickIdVisitor from "@/analysis/analysisVisitors/brickIdVisitor";
import { removeUndefined } from "@/utils/objectUtils";
import { toExpression } from "@/utils/expressionUtils";

/**
 * Return true if the given registry id corresponds to a built-in package.
 *
 * Note that user-defined packages use the `@pixies` namespace.
 *
 * @param id the registry id
 */
export function isOfficial(id: RegistryId): boolean {
  return id.startsWith("@pixiebrix/");
}

/**
 * Returns the initial state for a brickConfig.
 *
 * Applies the default values from the schema, if any.
 *
 * @param schema the JSON Schema
 */
export function defaultBrickConfig(schema: Schema): BrickConfig["config"] {
  if (typeof schema.properties === "object") {
    return removeUndefined(
      mapValues(
        pickBy(
          schema.properties,
          (x) =>
            typeof x !== "boolean" &&
            ((x.default != null && !x.anyOf && !x.oneOf) ||
              x.$ref === pipelineSchema.$id),
        ),
        (propertySchema: Schema) => {
          if (propertySchema.$ref === pipelineSchema.$id) {
            return toExpression("pipeline", []);
          }

          if (typeof propertySchema.default !== "object") {
            return propertySchema.default;
          }
        },
      ),
    ) as UnknownObject;
  }

  return {};
}

/**
 * Return bricks for all bricks referenced in a pipeline, including any sub-pipelines.
 *
 * NOTE: Does not de-duplicate bricks.
 */
export async function collectAllBricks(
  config: BrickConfig | BrickPipeline,
): Promise<Brick[]> {
  const ids = BrickIdVisitor.collectBrickIds(config);
  return Promise.all([...ids].map(async (id) => brickRegistry.lookup(id)));
}
