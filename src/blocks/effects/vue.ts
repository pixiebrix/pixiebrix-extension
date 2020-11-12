/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createSendScriptMessage } from "@/messaging/chrome";
import { SET_VUE_VALUES } from "@/messaging/constants";

export const withSetVueValues = createSendScriptMessage<unknown>(
  SET_VUE_VALUES
);

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

export class SetVueValues extends Effect {
  constructor() {
    super(
      "@pixiebrix/vue/set-values",
      "Set Vue.js values",
      "Set values on a Vue.js component"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      component: {
        type: "string",
      },
      values: {
        type: "object",
        minProperties: 1,
        additionalProperties: true,
      },
    },
    required: ["component", "values"],
  };

  async effect({
    component: selector,
    values: valueMap,
  }: BlockArg): Promise<void> {
    await withSetVueValues({ selector, valueMap });
  }
}

registerBlock(new SetVueValues());
