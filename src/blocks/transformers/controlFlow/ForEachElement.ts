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

import { Transformer } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { PipelineExpression } from "@/runtime/mapArgs";
import { validateRegistryId } from "@/types/helpers";
import { $safeFind } from "@/helpers";

class ForEachElement extends Transformer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/for-each-element");
  defaultOutputKey = "forEachResult";

  constructor() {
    super(
      ForEachElement.BLOCK_ID,
      "For-Each Element",
      "Loop over elements on the page, returning the value of the last iteration"
    );
  }

  override async isPure(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if pure
    return false;
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        format: "selector",
        description: "A selector to match elements on the page",
      },
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The bricks to execute for each element",
      },
    },
    ["selector", "body"]
  );

  async transform(
    {
      selector,
      body: bodyPipeline,
    }: BlockArg<{
      selector: string;
      body: PipelineExpression;
    }>,
    options: BlockOptions
  ): Promise<unknown> {
    const elements = $safeFind(selector, options.root ?? document);

    let last: unknown;

    for (const element of elements.get()) {
      // eslint-disable-next-line no-await-in-loop -- synchronous for-loop brick
      last = await options.runPipeline(bodyPipeline.__value__, {}, element);
    }

    return last;
  }
}

export default ForEachElement;
