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

import { Effect } from "@/types";
import { type BlockArg, type Schema } from "@/core";
import { type JsonObject } from "type-fest";
import { SubmitPanelAction } from "@/blocks/errors";

export class SubmitPanelEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/display/action",
      "Submit Panel",
      "Submit/close the panel that contains this brick"
    );
  }

  inputSchema: Schema = {
    type: "object",

    properties: {
      type: {
        type: "string",
        description: "The type of action, e.g. submit or close",
        examples: ["submit", "close"],
      },
      detail: {
        type: "object",
        description: "Optional data/details to return from the panel",
        additionalProperties: true,
      },
    },

    required: ["type"],
  };

  async effect({
    type,
    detail = {},
  }: BlockArg<{
    type: string;
    detail: JsonObject;
  }>): Promise<void> {
    throw new SubmitPanelAction(type, detail);
  }
}

export default SubmitPanelEffect;
