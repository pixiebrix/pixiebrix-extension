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

import { TransformerABC } from "../../types/bricks/transformerTypes";
import { type BrickArgs } from "../../types/runtimeTypes";
import { random } from "lodash";
import { BusinessError } from "@/errors/businessErrors";
import { propertiesToSchema } from "../../utils/schemaUtils";

export class RandomNumber extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/random",
      "Random Number",
      "Generate a random integer or decimal number",
    );
  }

  override defaultOutputKey = "random";

  override async isPure(): Promise<boolean> {
    return false;
  }

  inputSchema = propertiesToSchema(
    {
      lower: {
        type: "number",
        description: "The lower bound (inclusive)",
        default: 0,
      },
      upper: {
        type: "number",
        description: "The upper bound (inclusive)",
        default: 1,
      },
      floating: {
        type: "boolean",
        description:
          "Flag to return a decimal (floating point) number instead of an integer.",
      },
    },
    [],
  );

  override outputSchema = propertiesToSchema(
    {
      value: {
        type: "number",
      },
    },
    ["value"],
  );

  async transform({
    lower = 0,
    upper = 1,
    floating = false,
  }: BrickArgs<{
    lower?: number;
    upper?: number;
    floating?: boolean;
  }>): Promise<{ value: number }> {
    if (lower > upper) {
      throw new BusinessError("lower bound cannot be greater than upper bound");
    }

    return {
      value: random(lower, upper, floating),
    };
  }
}
