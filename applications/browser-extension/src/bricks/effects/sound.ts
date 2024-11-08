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
import type { BrickArgs, BrickOptions } from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import type { PlatformCapability } from "../../platform/capabilities";
import { propertiesToSchema } from "../../utils/schemaUtils";

export class SoundEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/audio",
      "Play Sound Effect",
      "Play a built-in sound effect",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      sound: {
        type: "string",
        enum: ["magic-wand", "applause", "doorbell", "success", "sad-trombone"],
        description: "The sound effect to play",
        default: "magic-wand",
      },
    },
    ["sound"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["audio"];
  }

  async effect(
    { sound }: BrickArgs<{ sound: string }>,
    { platform }: BrickOptions,
  ): Promise<void> {
    await platform.audio.play(sound);
  }
}
