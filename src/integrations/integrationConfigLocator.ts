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

import { type RemoteIntegrationConfig } from "@/types/contract";
import { isEmpty, sortBy } from "lodash";
import integrationRegistry from "@/integrations/registry";
import { validateRegistryId } from "@/types/helpers";
import { expectContext, forbidContext } from "@/utils/expectContext";
import { ExtensionNotLinkedError } from "@/errors/genericErrors";
import { MissingConfigurationError } from "@/errors/businessErrors";
import {
  type IntegrationABC,
  type IntegrationConfig,
  type SanitizedConfig,
  type SanitizedIntegrationConfig,
  type SecretsConfig,
} from "@/integrations/integrationTypes";
import { type UUID } from "@/types/stringTypes";
import { DoesNotExistError, type RegistryId } from "@/types/registryTypes";
import { sanitizeIntegrationConfig } from "@/integrations/sanitizeIntegrationConfig";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import { getLinkedApiClient } from "@/data/service/apiClient";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { type SetRequired } from "type-fest";
import { pixiebrixConfigurationFactory } from "@/integrations/util/pixiebrixConfigurationFactory";
import { readRawConfigurations } from "@/integrations/util/readRawConfigurations";
import { API_PATHS } from "@/data/service/urlPaths";

enum Visibility {
  Private = 0,
  Team,
  BuiltIn,
}

type Option = {
  /**
   * The configuration id.
   */
  id: UUID;

  /**
   * Human-readable label for the configuration to distinguish it from other configurations for the same integration
   * in the interface.
   */
  label: string | undefined;

  /**
   * The registry id of the integration definition package.
   */
  serviceId: RegistryId;
  /**
   * Visibility/provenance of the integration configuration.
   */
  level: Visibility;
  /**
   * The provenance of the configuration option. True if the integration was configured in the Extension Console.
   */
  local: boolean;
  /**
   * True if the integration configuration uses the API Gateway.
   * @since 1.7.34
   */
  proxy: boolean;
  /**
   * The configuration, including secrets for locally-defined and pushdown integration configurations.
   */
  config: SecretsConfig | SanitizedConfig;
};

let wasInitialized = false;

/**
 * Singleton class for finding local and remote integration configurations.
 *
 * NOTE: this class handles integration configurations, not the integration definitions. For integration definitions,
 * see the `integrations.registry` file.
 */
class IntegrationConfigLocator {
  private remote: RemoteIntegrationConfig[] = [];

  private local: IntegrationConfig[] = [];

  private options: Option[] = [];

  private updateTimestamp: number | undefined;

  constructor() {
    forbidContext(
      "contentScript",
      "LazyIntegrationConfigLocatorFactory cannot run in the contentScript",
    );

    if (wasInitialized) {
      throw new Error(
        "LazyIntegrationConfigLocatorFactory is a singleton class",
      );
    }

    wasInitialized = true;
  }

  get initialized(): boolean {
    return Boolean(this.updateTimestamp);
  }

  async refreshRemote(): Promise<void> {
    try {
      // As of https://github.com/pixiebrix/pixiebrix-app/issues/562, the API gracefully handles unauthenticated calls
      // to this endpoint. However, there's no need to pull the built-in integrations because the user can't call them
      // without being authenticated
      const client = await getLinkedApiClient();
      const { data } = await client.get<RemoteIntegrationConfig[]>(
        // Fetch full configurations, including credentials for configurations with pushdown
        API_PATHS.INTEGRATIONS_SHARED,
      );
      this.remote = data;
      console.debug(
        `Fetched ${this.remote.length} remote integration configuration(s)`,
      );
    } catch (error) {
      if (error instanceof ExtensionNotLinkedError) {
        this.remote = [];
      } else {
        throw error;
      }
    }

    this.initializeOptions();
  }

  async refreshLocal(): Promise<void> {
    this.local = await readRawConfigurations();
    this.initializeOptions();
  }

  /**
   * Refreshes the local and remote integration configurations.
   */
  // eslint-disable-next-line unicorn/consistent-function-scoping -- Clearer here
  refresh = memoizeUntilSettled(async () => {
    const timestamp = Date.now();
    await Promise.all([this.refreshLocal(), this.refreshRemote()]);
    this.initializeOptions();
    this.updateTimestamp = timestamp;
    console.debug("Refreshed integration configuration locator", {
      updateTimestamp: this.updateTimestamp,
    });
  });

  private initializeOptions() {
    this.options = sortBy(
      [
        ...this.local.map(
          (x) =>
            ({
              ...x,
              level: Visibility.Private,
              local: true,
              proxy: false,
              serviceId: x.integrationId,
              // TODO: Unsafe. Remove once the `id` in `IntegrationConfig` is not optional
            }) as SetRequired<Option, "id">,
        ),
        ...(this.remote ?? []).map((x) => ({
          ...x,
          // Server JSON response uses null instead of undefined for `label`
          label: x.label ?? undefined,
          level: x.organization ? Visibility.Team : Visibility.BuiltIn,
          local: false,
          proxy: !x.pushdown,
          serviceId: validateRegistryId(x.service.name),
        })),
      ],
      (x) => x.level,
    );
  }

  /**
   * Return the corresponding integration configuration, including secrets. Returns `undefined` if a remote
   * configuration requiring the proxy, or not found.
   *
   * Prior to 1.7.34, only could return locally-defined configurations. Now also returns remote pushdown configurations.
   *
   * @param configId UUID of the integration configuration
   * @see findSanitizedIntegrationConfig
   */
  async findIntegrationConfig(
    configId: UUID,
  ): Promise<IntegrationConfig | undefined> {
    if (!this.initialized) {
      await this.refresh();
    }

    const remote = this.remote
      .filter((x) => x.pushdown)
      .map(
        (x) =>
          ({
            id: x.id,
            integrationId: x.service.name,
            label: x.label,
            config: x.config,
            // `config` will contain secrets because we filtered for pushdown configurations
          }) as IntegrationConfig,
      );

    return [...this.local, ...remote].find((x) => x.id === configId);
  }

  async findAllSanitizedConfigsForIntegration(
    integrationId: RegistryId,
  ): Promise<SanitizedIntegrationConfig[]> {
    if (!this.initialized) {
      await this.refresh();
    }

    if (integrationId === PIXIEBRIX_INTEGRATION_ID) {
      // HACK: for now use the separate storage for the extension key
      return [pixiebrixConfigurationFactory()];
    }

    let integration: IntegrationABC;

    // Handle case where locateAllForService is called before service definitions are loaded. (For example, because it's
    // being called from the background page in installer.ts).
    // In the future, we may want to expose an option on the method to control this behavior.
    try {
      integration = await integrationRegistry.lookup(integrationId);
    } catch (error) {
      if (error instanceof DoesNotExistError) {
        return [];
      }

      throw error;
    }

    return this.options
      .filter((x) => x.serviceId === integrationId)
      .map((match) => ({
        _sanitizedIntegrationConfigBrand: null,
        id: match.id,
        label: match.label,
        serviceId: integrationId,
        proxy: match.proxy,
        config: sanitizeIntegrationConfig(integration, match.config),
      }));
  }

  /**
   * Return the sanitized integration configuration, with secrets removed.
   * @param integrationId the integration definition (for determining which properties are secrets)
   * @param integrationConfigId the configuration id
   * @throws MissingConfigurationError if configuration not found for the given integration id
   */
  async findSanitizedIntegrationConfig(
    integrationId: RegistryId,
    integrationConfigId: UUID,
  ): Promise<SanitizedIntegrationConfig> {
    expectContext(
      "background",
      "The integration configuration locator must run in the background worker",
    );

    if (integrationId === PIXIEBRIX_INTEGRATION_ID) {
      // Since 1.8.13 the locator should not be used to instantiate the pixiebrix integration config
      throw new Error(
        "Use `pixiebrixConfigurationFactory` to instantiate the pixiebrix integration config",
      );
    }

    if (!this.initialized) {
      await this.refresh();
    }

    const integration = await integrationRegistry.lookup(integrationId);

    const match = this.options.find(
      (x) => x.serviceId === integrationId && x.id === integrationConfigId,
    );

    if (!match) {
      throw new MissingConfigurationError(
        `Configuration ${integrationConfigId} not found for ${integrationId}`,
        integrationId,
        integrationConfigId,
      );
    }

    // Proxied configurations have their secrets removed, so can be empty on the client-side.
    // Some OAuth2 PKCE integrations, e.g. google/oauth2-pkce, don't require any configurations, so can be empty.
    if (
      isEmpty(match.config) &&
      !isEmpty(integration.schema.properties) &&
      !match.proxy &&
      integration.hasAuth
    ) {
      console.warn(
        `Config ${integrationConfigId} for integration ${integrationId} is empty`,
      );
    }

    console.debug(`Locate integration configuration for ${integrationId}`, {
      currentTimestamp: Date.now(),
      updateTimestamp: this.updateTimestamp,
      id: integrationConfigId,
      proxy: match.proxy,
    });

    return {
      _sanitizedIntegrationConfigBrand: null,
      id: integrationConfigId,
      label: match.label,
      serviceId: integrationId,
      proxy: match.proxy,
      config: sanitizeIntegrationConfig(integration, match.config),
    };
  }
}

export default IntegrationConfigLocator;
