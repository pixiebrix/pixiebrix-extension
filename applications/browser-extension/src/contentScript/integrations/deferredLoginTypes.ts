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
  Integration,
  SanitizedIntegrationConfig,
} from "@/integrations/integrationTypes";

/**
 * An interactive login that's being deferred until the user initiates the login.
 * @since 1.8.11
 */
export type DeferredLogin = {
  /**
   * Integration metadata to display in the UI.
   */
  integration: Pick<Integration, "name">;
  /**
   * Configuration for the integration.
   */
  config: SanitizedIntegrationConfig;
};
