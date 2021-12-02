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
import { propertiesToSchema } from "@/validators/generic";
import { $safeFind } from "@/helpers";

export class HideEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/hide",
      "Hide",
      "Hide or remove one or more elements on a page"
    );
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
      },
    },
    ["selector"]
  );

  async effect({
    selector,
    mode = "hide",
  }: BlockArg<{
    selector: string;
    mode?: "hide" | "remove";
  }>): Promise<void> {
    const $elt = $safeFind(selector);
    if (mode === "hide") {
      $elt.hide();
    } else {
      $elt.remove();
    }
  }
}
