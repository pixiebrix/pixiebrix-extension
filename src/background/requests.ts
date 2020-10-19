import axios, { AxiosRequestConfig, Method } from "axios";
import { liftBackground } from "@/background/protocol";
import { SanitizedServiceConfiguration, ServiceConfig } from "@/core";
import { pixieServiceFactory } from "@/services/locator";
import { getBaseURL } from "@/services/baseService";
import { RemoteServiceError } from "@/services/errors";
import serviceRegistry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import { getExtensionToken } from "@/auth/token";
import { locator } from "@/background/locator";
import { ContextError } from "@/errors";
import { isBackgroundPage } from "webext-detect-page";
import {
  deleteCachedOAuth2,
  getCachedOAuth2,
  launchOAuth2Flow,
} from "@/background/auth";

export interface RemoteResponse<T extends {} = {}> {
  data: T;
  status: number;
  statusText: string;
  $$proxied?: boolean;
}

/**
 * @deprecated use proxyService instead
 */
export const post = liftBackground(
  "HTTP_POST",
  async (
    url: string,
    // Types we want to pass in might not have an index signature, and we want to provide a default
    // eslint-disable-next-line @typescript-eslint/ban-types
    data: object,
    config?: { [key: string]: string | string[] }
  ) => {
    return await axios.post(url, data, config);
  }
);

const request = liftBackground("HTTP_REQUEST", (config: AxiosRequestConfig) =>
  axios(config)
);

async function authenticate(
  config: SanitizedServiceConfiguration,
  request: AxiosRequestConfig
): Promise<AxiosRequestConfig> {
  if (!isBackgroundPage()) {
    throw new Error("authenticate can only be called from the background page");
  }

  const service = serviceRegistry.lookup(config.serviceId);

  if (service.id === PIXIEBRIX_SERVICE_ID) {
    const apiKey = await getExtensionToken();
    if (!apiKey) {
      throw new Error("Extension not authenticated with PixieBrix web service");
    }
    return service.authenticateRequest(
      ({ apiKey } as unknown) as ServiceConfig,
      request
    );
  } else if (service.isOAuth2) {
    const localConfig = await locator.getLocalConfig(config.id);
    let data = await getCachedOAuth2(config.id);
    if (!data) {
      data = await launchOAuth2Flow(service, localConfig);
    }
    return service.authenticateRequest(localConfig.config, request, data);
  } else {
    const localConfig = await locator.getLocalConfig(config.id);
    return service.authenticateRequest(localConfig.config, request);
  }
}

async function proxyRequest<T>(
  service: SanitizedServiceConfiguration,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse<T>> {
  const proxyResponse = await request(
    await authenticate(await pixieServiceFactory(), {
      url: `${await getBaseURL()}/api/proxy/`,
      method: "post" as Method,
      data: {
        ...requestConfig,
        service_id: service.serviceId,
      },
    })
  );
  console.debug(`Proxy response for ${service.serviceId}:`, proxyResponse);

  if (proxyResponse.data.status_code >= 400) {
    throw new RemoteServiceError(
      proxyResponse.data.message ?? proxyResponse.data.reason,
      proxyResponse
    );
  } else {
    // The json payload from the proxy is the response from the remote server
    return {
      ...proxyResponse.data.json,
      $$proxied: true,
    };
  }
}

const _proxyService = liftBackground(
  "PROXY",
  async (
    serviceConfig: SanitizedServiceConfiguration | null,
    requestConfig: AxiosRequestConfig
  ): Promise<RemoteResponse> => {
    try {
      if (serviceConfig.proxy) {
        console.debug(
          `proxy request for ${serviceConfig.id} to ${serviceConfig.serviceId}`
        );
        return await proxyRequest(serviceConfig, requestConfig);
      } else {
        try {
          return await request(
            await authenticate(serviceConfig, requestConfig)
          );
        } catch (ex) {
          if (ex.response.status === 401) {
            console.debug(
              `deleting cached oauth2 data for ${serviceConfig.id} for ${serviceConfig.serviceId}`
            );
            await deleteCachedOAuth2(serviceConfig.id);
            throw new Error(
              "Authentication error: login to the service again or double-check your API key"
            );
          }
          throw ex;
        }
      }
    } catch (ex) {
      throw new ContextError(ex, {
        serviceId: serviceConfig.id,
        authId: serviceConfig.id,
      });
    }
  }
);

export async function proxyService<TData>(
  serviceConfig: SanitizedServiceConfiguration | null,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse<TData>> {
  if (typeof serviceConfig !== "object") {
    throw new Error("expected configured service for serviceConfig");
  } else if (!serviceConfig) {
    return await request(requestConfig);
  } else {
    return (await _proxyService(
      serviceConfig,
      requestConfig
    )) as RemoteResponse<TData>;
  }
}
