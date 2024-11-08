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

import { EffectABC } from "../../types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import {
  IS_ROOT_AWARE_BRICK_PROPS,
  $safeFindElementsWithRootMode,
} from "../rootModeHelpers";
import { propertiesToSchema } from "../../utils/schemaUtils";

export class EnableEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/enable",
      "Enable Element",
      "Enable an element (e.g., button, input)",
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
    [],
  );

  async effect(
    args: BrickArgs<{ selector: string; isRootAware?: boolean }>,
    { root }: BrickOptions,
  ): Promise<void> {
    const elements = $safeFindElementsWithRootMode({
      ...args,
      root,
      blockId: this.id,
    });

    elements.prop("disabled", false);
  }
}
