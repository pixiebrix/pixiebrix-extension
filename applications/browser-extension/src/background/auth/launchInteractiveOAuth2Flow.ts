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

import type { UUID } from "../../types/stringTypes";
import { integrationConfigLocator } from "../integrationConfigLocator";
import { BusinessError } from "@/errors/businessErrors";
import integrationRegistry from "../../integrations/registry";
import launchOAuth2Flow from "./launchOAuth2Flow";

/**
 * Launch the interactive OAuth2 flow for the given integration configuration.
 *
 * Use oauth2Storage to listen for successful login.
 *
 * @param configId integration configuration id
 * @see launchOAuth2Flow
 * @see oauth2Storage
 */
// Currently in its own file because launchOAuth2Flow has strict null checks enabled and this file references the
// integration registry and configuration locator
async function launchInteractiveOAuth2Flow(configId: UUID): Promise<void> {
  const config = await integrationConfigLocator.findIntegrationConfig(configId);

  if (!config) {
    throw new BusinessError(`Integration config not found: ${configId}`);
  }

  const integration = await integrationRegistry.lookup(config.integrationId);
  await launchOAuth2Flow(integration, config, { interactive: true });
}

export default launchInteractiveOAuth2Flow;
