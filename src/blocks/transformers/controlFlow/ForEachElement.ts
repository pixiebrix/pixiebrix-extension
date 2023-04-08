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

import { Transformer } from "@/types/blocks/transformerTypes";
import { type BlockArg, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { validateRegistryId } from "@/types/helpers";
import { $safeFind } from "@/helpers";
import { castArray } from "lodash";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { PropError } from "@/errors/businessErrors";

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
      elementKey: {
        type: "string",
        default: "element",
        description:
          "The element key/variable for the body of the loop, without the leading @",
      },
    },
    ["selector", "body"]
  );

  async transform(
    {
      selector,
      body: bodyPipeline,
      // For backward compatibility, don't default to "element"
      elementKey,
    }: BlockArg<{
      selector: string;
      body: PipelineExpression;
      elementKey?: string;
    }>,
    options: BlockOptions
  ): Promise<unknown> {
    if (elementKey) {
      try {
        validateOutputKey(elementKey);
      } catch {
        throw new PropError(
          "Invalid value for elementKey",
          this.id,
          "elementKey",
          null
        );
      }
    }

    const elements = $safeFind(selector, options.root ?? document);

    let last: unknown;

    for (const [index, element] of castArray(elements.get()).entries()) {
      const extraContext = elementKey
        ? {
            [`@${elementKey}`]: getReferenceForElement(element),
          }
        : {};

      // eslint-disable-next-line no-await-in-loop -- synchronous for-loop brick
      last = await options.runPipeline(
        bodyPipeline.__value__,
        { key: "body", counter: index },
        extraContext,
        element
      );
    }

    return last;
  }
}

export default ForEachElement;
