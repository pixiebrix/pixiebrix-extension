/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Effect } from "@/types";
import { BlockArg, Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";
import { awaitElementOnce } from "@/extensionPoints/helpers";

export class WaitElementEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/wait/element",
      "Wait for a DOM element",
      "Wait for a DOM element to be on the page"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      selector: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
      },
    },
    required: ["selector"],
  };

  async effect({ selector }: BlockArg): Promise<void> {
    const [promise] = awaitElementOnce(selector);
    await promise;
  }
}

registerBlock(new WaitElementEffect());
