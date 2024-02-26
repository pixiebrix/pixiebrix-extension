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
import { validateSemVerString } from "@/types/helpers";
import type { UUID } from "@/types/stringTypes";
import { traces } from "@/background/messenger/strict/api";
import { clearExtensionDebugLogs } from "@/background/messenger/api";

/**
 * The extension page platform.
 *
 * Extension pages generally don't run bricks. However:
 * - The sidebar runs bricks, e.g., in PanelBody
 * - The Extension Console and Page Editor instantiate bricks to access the brick instance methods
 */
class ExtensionPagePlatform extends PlatformBase {
  override capabilities: PlatformCapability[] = [
    "dom",
    "alert",
    "toast",
    "logs",
    "debugger",
  ];

  private readonly _logger = new BackgroundLogger({
    platformName: "extension",
  });

  constructor() {
    super(
      "extension",
      validateSemVerString(browser.runtime.getManifest().version),
    );
  }

  override alert = window.alert;
  override prompt = window.prompt;

  override get logger() {
    return this._logger;
  }

  // Support tracing for bricks run in the sidebar. See PanelBody.tsx
  override get debugger(): PlatformProtocol["debugger"] {
    return {
      async clear(componentId: UUID): Promise<void> {
        await Promise.all([
          traces.clear(componentId),
          clearExtensionDebugLogs(componentId),
        ]);
      },
      traces: {
        enter: traces.addEntry,
        exit: traces.addExit,
      },
    };
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
