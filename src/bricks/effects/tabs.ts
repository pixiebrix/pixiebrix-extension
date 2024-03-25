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
import { type Schema } from "@/types/schemaTypes";
import { focusTab, closeTab } from "@/background/messenger/api";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class ActivateTabEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/browser/activate-tab",
      "Activate browser tab/window",
      "Activate the tab/window",
    );
  }

  inputSchema: Schema = propertiesToSchema({}, []);

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async effect(): Promise<void> {
    await focusTab();
  }
}

export class CloseTabEffect extends EffectABC {
  constructor() {
    super("@pixiebrix/browser/close-tab", "Close browser tab", "Close the tab");
  }

  inputSchema: Schema = propertiesToSchema({}, []);

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    // Could get away with just "dom" if the brick used window.close. But window.close doesn't work in sub-frames.
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async effect(): Promise<void> {
    await closeTab();
  }
}
