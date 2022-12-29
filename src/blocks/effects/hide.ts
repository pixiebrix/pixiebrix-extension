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

import { Effect } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "@/blocks/rootModeHelpers";

export class HideEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/hide",
      "Hide",
      "Hide or remove one or more elements on a page"
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        format: "selector",
      },
      mode: {
        type: "string",
        enum: ["hide", "remove"],
        default: "hide",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    []
  );

  async effect(
    {
      selector,
      mode = "hide",
      isRootAware,
    }: BlockArg<{
      selector: string;
      mode?: "hide" | "remove";
      isRootAware: boolean;
    }>,
    { root }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      isRootAware,
      blockId: this.id,
      root,
    });

    if (mode === "hide") {
      $elements.hide();
    } else {
      $elements.remove();
    }
  }
}
