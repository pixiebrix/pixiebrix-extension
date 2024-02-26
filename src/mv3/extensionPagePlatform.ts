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

import {
  PlatformBase,
  type PlatformProtocol,
} from "@/platform/platformProtocol";
import { hideNotification, showNotification } from "@/utils/notify";
import type { PlatformCapability } from "@/platform/capabilities";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { SemVerString } from "@/types/registryTypes";

/**
 * The Page Editor platform. The Page Editor doesn't run bricks, but does instantiate user-defined bricks for
 * access to the Brick instance methods.
 */
class ExtensionPagePlatform extends PlatformBase {
  override capabilities: PlatformCapability[] = [
    "dom",
    "alert",
    "toast",
    "logs",
  ];

  private readonly _logger = new BackgroundLogger({
    platformName: "extension",
  });

  constructor() {
    super("extension", browser.runtime.getManifest().version as SemVerString);
  }

  override alert = window.alert;
  override prompt = window.prompt;

  override get logger() {
    return this._logger;
  }

  override get toasts(): PlatformProtocol["toasts"] {
    return {
      showNotification,
      hideNotification,
    };
  }
}

const extensionPagePlatform = new ExtensionPagePlatform();
export default extensionPagePlatform;
