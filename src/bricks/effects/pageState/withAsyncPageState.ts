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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";

export class WithAsyncPageState extends TransformerABC {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/use-async-state");

  constructor() {
    super(
      WithAsyncPageState.BRICK_ID,
      "With Async Page State",
      "Utility brick to track an async operation in the page state"
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  defaultOutputKey = "state";

  inputSchema: Schema = propertiesToSchema(
    {
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The async operation",
      },
      stateKey: {
        type: "string",
        description: "The mod state key to track the async state",
      },
    },
    ["body", "stateKey"]
  );

  async transform() {
    // TODO: implement me
  }
}
