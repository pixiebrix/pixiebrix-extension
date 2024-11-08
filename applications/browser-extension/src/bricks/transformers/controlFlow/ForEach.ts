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
} from "../../../types/runtimeTypes";
import { validateRegistryId } from "../../../types/helpers";
import { type Schema } from "../../../types/schemaTypes";
import { propertiesToSchema } from "../../../utils/schemaUtils";

class ForEach extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/for-each");
  override defaultOutputKey = "forEachOutput";

  constructor() {
    super(
      ForEach.BRICK_ID,
      "For-Each Loop",
      "Loop over elements in a list/array, returning the value of the last iteration",
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

  inputSchema: Schema = propertiesToSchema(
    {
      elements: {
        type: "array",
        description: "A list/array of elements to loop over",
      },
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to execute for each element",
      },
      elementKey: {
        type: "string",
        default: "element",
        description:
          "The element key/variable for the body of the loop, without the leading @",
      },
    },
    ["elements", "body"],
  );

  async transform(
    {
      elements,
      body: bodyPipeline,
      elementKey = validateOutputKey("element"),
    }: BrickArgs<{
      elements: unknown[];
      body: PipelineExpression;
      elementKey: OutputKey;
    }>,
    options: BrickOptions,
  ): Promise<unknown> {
    let last: unknown;

    for (const [index, element] of elements.entries()) {
      // eslint-disable-next-line no-await-in-loop -- synchronous for-loop brick
      last = await options.runPipeline(
        bodyPipeline,
        { key: "body", counter: index },
        {
          [`@${elementKey}`]: element,
        },
      );
    }

    return last;
  }
}

export default ForEach;
