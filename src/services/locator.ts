/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ConfigurableAuth } from "@/types/contract";
import {
  SanitizedServiceConfiguration,
  IService,
  RawServiceConfiguration,
  ServiceConfig,
  ServiceLocator,
  SanitizedConfig,
} from "@/core";
import sortBy from "lodash/sortBy";
import registry, {
  PIXIEBRIX_SERVICE_ID,
  readRawConfigurations,
} from "@/services/registry";
import { inputProperties } from "@/helpers";
import {
  MissingConfigurationError,
  NotConfiguredError,
} from "@/services/errors";
import { fetch } from "@/hooks/fetch";

const REF_SECRETS = [
  "https://app.pixiebrix.com/schemas/key#",
  "https://app.pixiebrix.com/schemas/key",
];

enum ServiceLevel {
  Private = 0,
  Team,
  BuiltIn,
}

/** Return config excluding any secrets/keys. */
export function excludeSecrets(
  service: IService,
  config: ServiceConfig
): SanitizedConfig {
  const result: SanitizedConfig = {} as SanitizedConfig;
  for (const [key, type] of Object.entries(inputProperties(service.schema))) {
    // @ts-ignore: ts doesn't think $ref can be on SchemaDefinition
    if (!REF_SECRETS.includes(type["$ref"])) {
      result[key] = config[key];
    }
  }
  return result;
}

export async function pixieServiceFactory(): Promise<
  SanitizedServiceConfiguration
> {
  return {
    _sanitizedServiceConfigurationBrand: undefined,
    id: undefined,
    serviceId: PIXIEBRIX_SERVICE_ID,
    // don't need to proxy requests to our own service
    proxy: false,
    config: {} as SanitizedConfig,
  };
}

type Option = {
  id: string;
  serviceId: string;
  level: ServiceLevel;
  local: boolean;
  config: ServiceConfig;
};

class LazyLocatorFactory {
  private remote: ConfigurableAuth[] = [];
  private local: RawServiceConfiguration[] = [];
  private options: Option[];
  private _initialized = false;
  private _refreshPromise: Promise<void>;

  get initialized(): boolean {
    return this._initialized;
  }

  async refreshRemote(): Promise<void> {
    this.remote = await fetch("/api/services/shared/?meta=1");
    console.debug(`Fetched ${this.remote.length} remote auths`);
    this.makeOptions();
  }

  async refreshLocal(): Promise<void> {
    this.local = await readRawConfigurations();
    this.makeOptions();
  }

  async refresh(): Promise<void> {
    if (this._refreshPromise) {
      return await this._refreshPromise;
    }
    this._refreshPromise = Promise.all([
      this.refreshLocal(),
      this.refreshRemote(),
    ]).then(() => {
      this.makeOptions();
      this._initialized = true;
    });
    await this._refreshPromise;
    this._refreshPromise = null;
  }

  private makeOptions() {
    this.options = sortBy(
      [
        ...this.local.map((x) => ({
          ...x,
          level: ServiceLevel.Private,
          local: true,
        })),
        ...(this.remote ?? []).map((x) => ({
          ...x,
          level: x.organization ? ServiceLevel.Team : ServiceLevel.BuiltIn,
          local: false,
          serviceId: x.service.name,
        })),
      ],
      (x) => x.level
    );
  }

  getLocator(): ServiceLocator {
    return this.locate.bind(this);
  }

  async getLocalConfig(authId: string): Promise<RawServiceConfiguration> {
    if (!this.initialized) {
      await this.refresh();
    }
    return this.local.find((x) => x.id === authId);
  }

  async locate(
    serviceId: string,
    authId: string
  ): Promise<SanitizedServiceConfiguration> {
    if (!this.initialized) {
      await this.refresh();
    }

    if (serviceId === PIXIEBRIX_SERVICE_ID) {
      // HACK: for now use the separate storage for the extension key
      return await pixieServiceFactory();
    } else if (!authId) {
      throw new NotConfiguredError(
        `No configuration selected for ${serviceId}`,
        serviceId
      );
    }

    const service = registry.lookup(serviceId);

    const match = this.options.find(
      (x) => x.serviceId === serviceId && x.id === authId
    );

    if (!match) {
      throw new MissingConfigurationError(
        `Configuration ${authId} not found for ${serviceId}`,
        serviceId,
        authId
      );
    }

    return {
      _sanitizedServiceConfigurationBrand: undefined,
      id: authId,
      serviceId: serviceId,
      proxy: service.hasAuth && !match.local,
      config: excludeSecrets(service, match.config),
    };
  }
}

export default LazyLocatorFactory;
