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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type Schema } from "@/types/schemaTypes";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import type { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { isContentScriptPlatformProtocol } from "@/contentScript/platform/contentScriptPlatformProtocol";

class SelectElement extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/html/select",
      "Select Element on Page",
      "Prompt the user to select an element on the page",
    );
  }

  override defaultOutputKey = "selected";

  // In the future, can add options for selecting multiple elements, providing instructions to the user, filtering
  // valid elements, etc.
  inputSchema: Schema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  };

  override outputSchema: Schema = propertiesToSchema(
    {
      elements: {
        type: "array",
        description: "The array of element references selected",
        items: {
          $ref: "https://app.pixiebrix.com/schemas/element#",
        },
      },
    },
    ["elements"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async transform(
    _args: BrickArgs,
    { platform }: BrickOptions,
  ): Promise<unknown> {
    if (!isContentScriptPlatformProtocol(platform)) {
      // Should never happen in practice because `getRequiredCapabilities` declares contentScript requirement
      throw new Error("Expected ContentScriptPlatformProtocol");
    }

    return {
      elements: await platform.userSelectElementRefs(),
    };
  }
}

export default SelectElement;
