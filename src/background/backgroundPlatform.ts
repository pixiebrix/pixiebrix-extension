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

import { PlatformBase } from "@/platform/platformProtocol";
import type { PlatformCapability } from "@/platform/capabilities";
import type { Nullishable } from "@/utils/nullishUtils";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import { performConfiguredRequest } from "@/background/requests";

/**
 * Background platform implementation. Currently, just makes API requests.
 * @since 1.8.10
 */
class BackgroundPlatform extends PlatformBase {
  // For now, the only capability we have the background is to run API requests.
  // In MV2, the background page has a DOM. In MV3, the background must use EventPages for DOM access
  override capabilities: PlatformCapability[] = ["http"];

  constructor() {
    super("background");
  }

  override async request<TData>(
    integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    requestConfig: AxiosRequestConfig,
  ): Promise<RemoteResponse<TData>> {
    return performConfiguredRequest(integrationConfig, requestConfig);
  }
}

// eslint-disable-next-line local-rules/persistBackgroundData -- platform implementation
const backgroundPlatform = new BackgroundPlatform();
export default backgroundPlatform;
