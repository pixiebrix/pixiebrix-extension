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

export class ShowEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/show",
      "Show",
      "Show one or more elements that are currently hidden on the page"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        format: "selector",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    []
  );

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      selector,
      isRootAware,
    }: BlockArg<{ selector?: string; isRootAware?: boolean }>,
    { root }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      root,
      isRootAware,
      blockId: this.id,
    });

    $elements.show();
  }
}
