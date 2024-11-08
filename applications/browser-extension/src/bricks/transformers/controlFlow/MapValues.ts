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

import { TransformerABC } from "../../../types/bricks/transformerTypes";
import { validateOutputKey } from "../../../runtime/runtimeTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type OutputKey,
  type PipelineExpression,
  VARIABLE_REFERENCE_PREFIX,
} from "../../../types/runtimeTypes";
import { validateRegistryId } from "../../../types/helpers";
import { type Schema } from "../../../types/schemaTypes";
import { propertiesToSchema } from "../../../utils/schemaUtils";

class MapValues extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/map");
  override defaultOutputKey = "mapped";

  constructor() {
    super(
      MapValues.BRICK_ID,
      "Map/Transform Values",
      "Map/Transform a list of values",
    );
  }

  override async isPure(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if pure
    return false;
  }

  override async isRootAware(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if any sub-calls are root aware
    return true;
  }

  override outputSchema: Schema = {
    type: "array",
    description: "The mapped/transformed values",
  };

  inputSchema: Schema = propertiesToSchema(
    {
      elements: {
        title: "Elements",
        type: "array",
        description: "A list/array of elements to loop over",
      },
      body: {
        title: "Body",
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to execute for each element",
      },
      elementKey: {
        title: "Element Variable Name",
        type: "string",
        default: "element",
        description:
          "The element key/variable for the body of the loop, without the leading @",
      },
      runParallel: {
        title: "Parallel",
        type: "boolean",
        default: false,
        description:
          "True to run the body in parallel, false to run sequentially",
      },
    },
    ["elements", "body"],
  );

  async transform(
    {
      elements,
      body: bodyPipeline,
      elementKey = validateOutputKey("element"),
      runParallel = false,
    }: BrickArgs<{
      elements: unknown[];
      body: PipelineExpression;
      elementKey: OutputKey;
      runParallel?: boolean;
    }>,
    options: BrickOptions,
  ): Promise<unknown> {
    const resultPromises: Array<Promise<unknown>> = [];

    for (const [index, element] of elements.entries()) {
      const promise = options.runPipeline(
        bodyPipeline,
        { key: "body", counter: index },
        {
          [`${VARIABLE_REFERENCE_PREFIX}${elementKey}`]: element,
        },
      );

      if (!runParallel) {
        // eslint-disable-next-line no-await-in-loop -- synchronous for-loop brick
        await promise;
      }

      resultPromises.push(promise);
    }

    return Promise.all(resultPromises);
  }
}

export default MapValues;
