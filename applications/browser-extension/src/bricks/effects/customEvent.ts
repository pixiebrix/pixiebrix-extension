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

import { type BrickArgs, type BrickOptions } from "../../types/runtimeTypes";
import properEvent from "proper-event";
import { type JsonObject } from "type-fest";
import { type UiSchema, type Schema } from "../../types/schemaTypes";
import { EffectABC } from "../../types/bricks/effectTypes";
import { validateRegistryId } from "../../types/helpers";
import type { PlatformCapability } from "../../platform/capabilities";

class CustomEventEffect extends EffectABC {
  public static BRICK_ID = validateRegistryId("@pixiebrix/event");

  constructor() {
    super(
      CustomEventEffect.BRICK_ID,
      "Emit a Custom Event",
      "Emit a custom event with custom data",
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      eventName: {
        type: "string",
        description: "A unique name/type for the event",
      },
      data: {
        type: "object",
        description: "A custom payload for the event",
        additionalProperties: true,
      },
    },
    required: ["eventName"],
  };

  override uiSchema: UiSchema = {
    eventName: {
      "ui:widget": "SchemaCustomEventWidget",
    },
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    // Supports both contentScript and standalone webapps
    return ["dom"];
  }

  async effect(
    {
      eventName,
      data = {},
    }: BrickArgs<{ eventName: string; data?: JsonObject }>,
    { root = document }: BrickOptions,
  ): Promise<void> {
    root.dispatchEvent(properEvent(eventName, { detail: data, bubbles: true }));
  }
}

export default CustomEventEffect;
