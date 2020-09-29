import { ConfigurableAuth } from "@/types/contract";
import {
  Authenticator,
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
import { getExtensionToken } from "@/auth/token";
import { proxyService } from "@/messaging/proxy";
import { getBaseURL } from "@/services/baseService";
import {
  MissingConfigurationError,
  MultipleConfigurationError,
} from "@/services/errors";

const REF_SECRETS = [
  "https://app.pixiebrix.com/schemas/key#",
  "https://www.pixiebrix.com/schemas/key#",
];

enum ServiceLevel {
  Private = 0,
  Team,
  BuiltIn,
}

const SERVICE_LEVEL_NAMES = {
  [ServiceLevel.Private]: "private",
  [ServiceLevel.Team]: "team",
  [ServiceLevel.BuiltIn]: "built-in",
};

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
  const token = await getExtensionToken();
  const service = registry.lookup(PIXIEBRIX_SERVICE_ID);
  return {
    proxy: false,
    serviceId: PIXIEBRIX_SERVICE_ID,
    config: {},
    authenticateRequest: (x) =>
      service.authenticateRequest({ apiKey: token }, x),
  };
}

const proxyRequiredAuthenticator: Authenticator = () => {
  throw new Error("Request must be proxied");
};

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
  public _initialized: boolean = false;
  private _refreshPromise: Promise<unknown>;

  constructor(baseURL?: string) {
    this.baseURL = baseURL;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  async refreshRemote() {
    const baseURL = this.baseURL ?? (await getBaseURL());
    try {
      this.remote = (await proxyService(await pixieServiceFactory(), {
        url: `${baseURL}/api/services/shared/?meta=1`,
      })) as ConfigurableAuth[];
      console.debug(`Fetched ${this.remote.length} remote auths`);
    } catch (ex) {
      console.warn("Not connected to pixiebrix service for remote auths", ex);
    }
    this.makeOptions();
  }

  async refreshLocal() {
    this.local = await readRawConfigurations();
    this.makeOptions();
  }

  async refresh() {
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
        ...this.remote.map((x) => ({
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

  async locate(
    serviceId: string,
    id: string | null
  ): Promise<ConfiguredService> {
    if (!this.initialized) {
      await this.refresh();
    }

    if (serviceId === PIXIEBRIX_SERVICE_ID) {
      // HACK: for now use the separate storage for the extension key
      return await pixieServiceFactory();
    }

    const service = registry.lookup(serviceId);

    const matches = this.options.filter(
      (x) => x.serviceId === serviceId && (!id || id === x.id)
    );

    if (!matches.length && id) {
      throw new MissingConfigurationError(
        `Configuration ${id} not found for ${serviceId}`,
        serviceId,
        id
      );
    } else if (!matches.length && !id) {
      throw new MissingConfigurationError(
        `No configurations found for ${serviceId}`,
        serviceId
      );
    }

    const best = sortBy(matches, (x) => x.level)[0];

    if (matches.filter((x) => x.level === best.level).length > 1) {
      throw new MultipleConfigurationError(
        `Multiple ${
          SERVICE_LEVEL_NAMES[best.level]
        } services are configured for ${serviceId}, you must select a service`,
        serviceId
      );
    }

    const proxy = service.hasAuth && !best.local;

    return {
      serviceId: serviceId,
      proxy,
      config: excludeSecrets(service, best.config),
      // include secrets required because they're required to authenticate the request
      authenticateRequest: proxy
        ? proxyRequiredAuthenticator
        : (x) => service.authenticateRequest(best.config, x),
    };
  }
}

export default LazyLocatorFactory;
