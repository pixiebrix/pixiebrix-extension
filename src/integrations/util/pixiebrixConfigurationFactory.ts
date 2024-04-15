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

import type {
  SanitizedConfig,
  SanitizedIntegrationConfig,
} from "@/integrations/integrationTypes";
import {
  PIXIEBRIX_INTEGRATION_CONFIG_ID,
  PIXIEBRIX_INTEGRATION_ID,
} from "@/integrations/constants";

export function pixiebrixConfigurationFactory(): SanitizedIntegrationConfig {
  return {
    id: PIXIEBRIX_INTEGRATION_CONFIG_ID,
    serviceId: PIXIEBRIX_INTEGRATION_ID,
    // Don't need to proxy requests to our own service
    proxy: false,
    config: {} as SanitizedConfig,
  } as SanitizedIntegrationConfig;
}
