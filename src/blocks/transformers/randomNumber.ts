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
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";
import { random } from "lodash";

export class RandomNumber extends Transformer {
  constructor() {
    super(
      "@pixiebrix/random",
      "Random Number",
      "Generate a random number",
      "faCode"
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  inputSchema = propertiesToSchema(
    {
      lower: {
        type: "number",
        description: "The lower bound",
        default: 0,
      },
      upper: {
        type: "number",
        description: "The upper bound",
        default: 1,
      },
      floating: {
        type: "boolean",
        description: "Specify returning a floating-point number.",
      },
    },
    []
  );

  override outputSchema = propertiesToSchema({
    value: {
      type: "number",
    },
  });

  async transform({
    lower = 0,
    upper = 1,
    floating = false,
  }: BlockArg<{
    lower?: number;
    upper?: number;
    floating?: boolean;
  }>): Promise<{ value: number }> {
    return {
      value: random(lower, upper, floating),
    };
  }
}
