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

import { EffectABC } from "@/types/bricks/effectTypes";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { BusinessError } from "@/errors/businessErrors";
import type { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

class SetToolbarBadge extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/toolbar/set-badge",
      "Set Toolbar Badge",
      "Sets a badge on the PixieBrix toolbar icon with the specified text. Will replace any existing badge.",
    );
  }

  inputSchema = propertiesToSchema(
    {
      text: {
        title: "Text",
        type: "string",
        description:
          "The text to display in the toolbar badge. Omit to remove the badge.",
      },
    },
    [],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["badge"];
  }

  async effect(
    { text }: BrickArgs<{ text: string }>,
    { platform, meta: { modComponentRef } }: BrickOptions,
  ): Promise<void> {
    if (isLoadedInIframe()) {
      throw new BusinessError("Cannot set toolbar badge from an iframe.");
    }

    platform.badge.setText(text, { modComponentRef });
  }
}

export default SetToolbarBadge;
