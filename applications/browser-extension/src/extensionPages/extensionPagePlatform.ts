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

import { type PlatformProtocol } from "../platform/platformProtocol";
import { hideNotification, showNotification } from "../utils/notify";
import type { PlatformCapability } from "../platform/capabilities";
import BackgroundLogger from "../telemetry/BackgroundLogger";
import type { UUID } from "@/types/stringTypes";
import {
  traces,
  clearModComponentDebugLogs,
  performConfiguredRequestInBackground,
} from "../background/messenger/api";
import { PlatformBase } from "../platform/platformBase";
import type { SanitizedIntegrationConfig } from "../integrations/integrationTypes";
import type { NetworkRequestConfig } from "@/types/networkTypes";
import type { RemoteResponse } from "@/types/contract";
import integrationRegistry from "../integrations/registry";
import { performConfiguredRequest } from "../background/requests";
import { getExtensionVersion } from "../utils/extensionUtils";
import { type Nullishable } from "../utils/nullishUtils";

/**
 * The extension page platform.
 *
 * Extension pages generally don't run bricks. However:
 * - The sidebar and ephemeral panel runs bricks, e.g., in PanelBody
 * - The Extension Console and Page Editor instantiate bricks to access the brick instance method and clear traces
 */
class ExtensionPagePlatform extends PlatformBase {
  override capabilities: PlatformCapability[] = [
    "dom",
    "alert",
    "toast",
    "logs",
    "debugger",
    "http",
  ];

  private readonly _logger = new BackgroundLogger({
    platformName: "extension",
  });

  constructor() {
    super("extension", getExtensionVersion());
  }

  override alert = window.alert;
  override prompt = window.prompt;

  override get logger() {
    return this._logger;
  }

  // Support tracing for bricks run in the sidebar and clearing logs in Page Editor/Extension Console. See PanelBody.tsx
  override get debugger(): PlatformProtocol["debugger"] {
    return {
      async clear(
        componentId: UUID,
        { logValues }: { logValues: boolean },
      ): Promise<void> {
        const clearPromises = [traces.clear(componentId)];

        if (logValues) {
          clearPromises.push(clearModComponentDebugLogs(componentId));
        }

        await Promise.all(clearPromises);
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

  override async request<TData>(
    integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    requestConfig: NetworkRequestConfig,
  ): Promise<RemoteResponse<TData>> {
    const integration = await integrationRegistry.lookup(
      integrationConfig?.serviceId,
    );

    // Use the background messenger to perform 3rd party API calls that may require refreshing credentials so that
    // the background worker can memoize the refresh calls and calls to launch the web auth flow
    if (integration.isToken || integration.isOAuth2) {
      return performConfiguredRequestInBackground(
        integrationConfig,
        requestConfig,
        // XXX: match the legacy behavior for now - always try to show the interactive login if possible
        { interactiveLogin: true },
      );
    }

    // `interactiveLogin: false` because interactive logins are only required for token-based authentication
    return performConfiguredRequest(integrationConfig, requestConfig, {
      interactiveLogin: false,
    });
  }
}

const extensionPagePlatform = new ExtensionPagePlatform();
export default extensionPagePlatform;
