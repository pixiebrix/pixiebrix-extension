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
  type Integration,
  type IntegrationConfig,
} from "@/integrations/integrationTypes";
import { type UUID } from "@/types/stringTypes";
import { uuidv4 } from "@/types/helpers";
import { type RegistryId } from "@/types/registryTypes";
import { GOOGLE_OAUTH2_PKCE_INTEGRATION_ID } from "@/contrib/google/sheets/core/schemas";
import { integrationConfigLocator } from "@/background/messenger/api";
import { getGoogleUserEmail } from "@/contrib/google/sheets/core/sheetsApi";

/**
 * A function to automatically configure an integration config. If null is returned, the config will be deleted instead.
 */
type AutoConfigureIntegrationConfig = (
  config: IntegrationConfig,
) => Promise<IntegrationConfig | null>;
export const autoConfigurations: Record<
  RegistryId,
  AutoConfigureIntegrationConfig
> = {
  async [GOOGLE_OAUTH2_PKCE_INTEGRATION_ID](config: IntegrationConfig) {
    const googleAccount =
      await integrationConfigLocator.findSanitizedIntegrationConfig(
        config.integrationId,
        config.id,
      );
    try {
      const userEmail = await getGoogleUserEmail(googleAccount);
      return {
        ...config,
        label: userEmail,
      };
    } catch (error) {
      console.warn(
        "Failed to get user email for Google PKCE integration config",
        error,
      );
      return null;
    }
  },
};

export async function autoConfigureIntegration(
  integration: Integration,
  temporaryLabel: string,
  {
    upsertIntegrationConfig,
    deleteIntegrationConfig,
    syncIntegrations,
  }: {
    upsertIntegrationConfig: (config: IntegrationConfig) => void;
    deleteIntegrationConfig: (id: UUID) => void;
    syncIntegrations: () => Promise<void>;
  },
): Promise<void> {
  const newIntegrationConfig = {
    id: uuidv4(),
    label: temporaryLabel,
    integrationId: integration.id,
    config: {},
  } as IntegrationConfig;
  upsertIntegrationConfig(newIntegrationConfig);
  await syncIntegrations();
  const transform = autoConfigurations[integration.id];
  if (!transform) {
    throw new Error(`No auto configuration for ${integration.id}`);
  }

  const transformed = await transform(newIntegrationConfig);
  if (transformed) {
    upsertIntegrationConfig(transformed);
  } else {
    deleteIntegrationConfig(newIntegrationConfig.id);
  }

  await syncIntegrations();
}
