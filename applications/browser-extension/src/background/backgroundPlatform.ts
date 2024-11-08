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

import { type PlatformProtocol } from "@/platform/platformProtocol";
import type { PlatformCapability } from "@/platform/capabilities";
import type { Nullishable } from "@/utils/nullishUtils";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { NetworkRequestConfig } from "@/types/networkTypes";
import type { RemoteResponse } from "@/types/contract";
import { performConfiguredRequest } from "@/background/requests";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { PlatformBase } from "@/platform/platformBase";
import { getExtensionVersion } from "@/utils/extensionUtils";

/**
 * Background platform implementation. Currently, just makes API requests.
 * @since 1.8.10
 */
class BackgroundPlatform extends PlatformBase {
  // In MV3, the background must use EventPages for DOM access. So for now,
  // we don't include "dom" in the capabilities.
  override capabilities: PlatformCapability[] = ["http", "logs"];

  private readonly _logger = new BackgroundLogger({
    platformName: "background",
  });

  constructor() {
    super("background", getExtensionVersion());
  }

  override get logger(): PlatformProtocol["logger"] {
    return this._logger;
  }

  override async request<TData>(
    integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    requestConfig: NetworkRequestConfig,
  ): Promise<RemoteResponse<TData>> {
    // XXX: keep the previous default behavior of interactiveLogin: true. Interactive logins will likely
    // fail though because they must be initiated from a user gesture.
    return performConfiguredRequest(integrationConfig, requestConfig, {
      interactiveLogin: true,
    });
  }
}

// eslint-disable-next-line local-rules/persistBackgroundData -- platform implementation
const backgroundPlatform = new BackgroundPlatform();
export default backgroundPlatform;
