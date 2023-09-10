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

import { mapValues, pickBy } from "lodash";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import blockRegistry from "@/bricks/registry";
import pipelineSchema from "@schemas/pipeline.json";
import { type RegistryId } from "@/types/registryTypes";
import { type Schema } from "@/types/schemaTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { type Brick } from "@/types/brickTypes";
import BlockIdVisitor from "@/analysis/analysisVisitors/blockIdVisitor";
import { removeUndefined } from "@/utils/objectUtils";
import { sleep } from "@/utils/timeUtils";

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
            ((x.default != null && !x.anyOf && !x.oneOf) ||
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

/** Return IBlocks for all blocks referenced in a pipeline, including any sub-pipelines. */
export async function selectAllBlocks(
  config: BrickConfig | BrickPipeline
): Promise<Brick[]> {
  const ids = BlockIdVisitor.collectBlockIds(config);
  return Promise.all([...ids].map(async (id) => blockRegistry.lookup(id)));
}

/**
 * Retry with jitter.
 * @param fn the function to execute
 * @param retries the number of times to retry
 * @param retryError the error to retry on; all other errors will be thrown
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  retries: number,
  retryError: Error
): Promise<T> {
  for (let failedAttempts = 0; failedAttempts <= retries; failedAttempts++) {
    const delayMs = Math.random() * 100;

    try {
      // eslint-disable-next-line no-await-in-loop -- retry use-case is an exception to the rule
      return await fn();
    } catch (error) {
      if (error !== retryError || failedAttempts === retries) {
        throw error;
      }

      // eslint-disable-next-line no-await-in-loop -- retry use-case is an exception to the rule
      await sleep(delayMs);
    }
  }
}
