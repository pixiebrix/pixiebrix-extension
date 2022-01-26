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
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { merge, cloneDeep } from "lodash";
import { BusinessError } from "@/errors";

let _pageState: Record<string, unknown> = {};

export class SetPageState extends Transformer {
  constructor() {
    super(
      "@pixiebrix/state/set",
      "Set shared page state",
      "Set shared page state values"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      data: {
        type: "object",
        description: "The data to set",
        additionalProperties: true,
      },
      mergeStrategy: {
        type: "string",
        enum: ["shallow", "replace", "deep"],
      },
    },
    ["data"]
  );

  async transform({
    data,
    mergeStrategy = "shallow",
  }: BlockArg): Promise<Record<string, unknown>> {
    const cloned = cloneDeep(data);

    switch (mergeStrategy) {
      case "replace": {
        _pageState = cloned;
        break;
      }

      case "deep": {
        _pageState = merge(_pageState, cloned);
        break;
      }

      case "shallow": {
        _pageState = { ..._pageState, ...cloned };
        break;
      }

      default: {
        throw new BusinessError(`Unknown merge strategy: ${mergeStrategy}`);
      }
    }

    return _pageState;
  }
}

export class GetPageState extends Transformer {
  constructor() {
    super(
      "@pixiebrix/state/get",
      "Get shared page state",
      "Get shared page state values"
    );
  }

  inputSchema: Schema = propertiesToSchema({});

  async transform(): Promise<Record<string, unknown>> {
    return _pageState;
  }
}
