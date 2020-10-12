import { ConfigurableAuth } from "@/types/contract";
import {
  ConfiguredService,
  IService,
  RawServiceConfiguration,
  ServiceConfig,
  ServiceLocator,
} from "@/core";
import sortBy from "lodash/sortBy";
import registry, {
  PIXIEBRIX_SERVICE_ID,
  readRawConfigurations,
} from "@/services/registry";
import { inputProperties } from "@/helpers";
import { proxyService, RemoteResponse } from "@/background/requests";
import { getBaseURL } from "@/services/baseService";
import {
  MissingConfigurationError,
  NotConfiguredError,
} from "@/services/errors";

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
): ServiceConfig {
  const result: ServiceConfig = {};
  for (const [key, type] of Object.entries(inputProperties(service.schema))) {
    // @ts-ignore: ts doesn't think $ref can be on SchemaDefinition
    if (!REF_SECRETS.includes(type["$ref"])) {
      result[key] = config[key];
    }
  }
  return result;
}

export async function pixieServiceFactory(): Promise<ConfiguredService> {
  return {
    id: undefined,
    serviceId: PIXIEBRIX_SERVICE_ID,
    proxy: false,
    config: {},
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
  private readonly baseURL: string | undefined;

  private remote: ConfigurableAuth[] = [];
  private local: RawServiceConfiguration[] = [];
  private options: Option[];
  private _initialized = false;
  private _refreshPromise: Promise<void>;

  constructor(baseURL?: string) {
    this.baseURL = baseURL;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  async refreshRemote(): Promise<void> {
    const baseURL = this.baseURL ?? (await getBaseURL());
    const { data } = (await proxyService(await pixieServiceFactory(), {
      url: `${baseURL}/api/services/shared/?meta=1`,
    })) as RemoteResponse<ConfigurableAuth[]>;
    this.remote = data;
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

  async locate(serviceId: string, authId: string): Promise<ConfiguredService> {
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
      id: authId,
      serviceId: serviceId,
      proxy: service.hasAuth && !match.local,
      config: excludeSecrets(service, match.config),
    };
  }
}

export default LazyLocatorFactory;
