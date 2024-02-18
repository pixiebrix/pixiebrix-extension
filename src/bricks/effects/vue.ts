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

import { setComponentData } from "@/pageScript/messenger/api";

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import {
  type PlatformCapability,
  PAGE_SCRIPT_CAPABILITIES,
} from "@/platform/capabilities";

export class SetVueValues extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/vue/set-values",
      "Set Vue.js values",
      "Set values on a Vue.js component",
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      component: {
        type: "string",
        description: "jQuery selector for the Vue.js component",
      },
      values: {
        type: "object",
        description:
          "Mapping from property path to new value (see https://lodash.com/docs/4.17.15#set)",
        minProperties: 1,
        additionalProperties: true,
      },
    },
    required: ["component", "values"],
  };

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return PAGE_SCRIPT_CAPABILITIES;
  }

  async effect({
    component: selector,
    values: valueMap,
  }: BrickArgs): Promise<void> {
    await setComponentData({ framework: "vue", selector, valueMap });
  }
}
