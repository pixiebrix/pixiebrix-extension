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

import axios, {
  AxiosPromise,
  AxiosRequestConfig,
  AxiosResponse,
  Method,
} from "axios";
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

interface ProxyResponseSuccessData {
  json: unknown;
  status_code: number;
}

interface ProxyResponseErrorData {
  json: unknown;
  status_code: number;
  message?: string;
  reason?: string;
}

type ProxyResponseData = ProxyResponseSuccessData | ProxyResponseErrorData;

// Partial view of an AxiosResponse for providing common interface for proxied requests
export interface RemoteResponse<T = unknown> {
  data: T;
  status: number;
  statusText?: string;
  $$proxied?: boolean;
}

function isErrorResponse(
  data: ProxyResponseData
): data is ProxyResponseErrorData {
  return data.status_code >= 400;
}

const backgroundRequest = liftBackground<
  AxiosRequestConfig,
  AxiosPromise<unknown>
>("HTTP_REQUEST", (config: AxiosRequestConfig) => axios(config));

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
  const proxyResponse = (await backgroundRequest(
    await authenticate(await pixieServiceFactory(), {
      url: `${await getBaseURL()}/api/proxy/`,
      method: "post" as Method,
      data: {
        ...requestConfig,
        service_id: service.serviceId,
      },
    })
  )) as AxiosResponse<ProxyResponseData>;
  const { data: remoteResponse } = proxyResponse;
  console.debug(`Proxy response for ${service.serviceId}:`, proxyResponse);

  if (isErrorResponse(remoteResponse)) {
    throw new RemoteServiceError(
      remoteResponse.message ?? remoteResponse.reason,
      proxyResponse
    );
  } else {
    // The json payload from the proxy is the response from the remote server
    return {
      data: remoteResponse.json as T,
      status: remoteResponse.status_code,
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
          return await backgroundRequest(
            await authenticate(serviceConfig, requestConfig)
          );
        } catch (ex) {
          if (ex.response.status === 401) {
            console.debug(
              `deleting cached oauth2 data for ${serviceConfig.id} for ${serviceConfig.serviceId}`
            );
            await deleteCachedOAuth2(serviceConfig.id);
            // Caught and re-thrown to add context
            // noinspection ExceptionCaughtLocallyJS
            throw new Error(
              "Authentication error: login to the service again or double-check your API key"
            );
          }
          // Caught and re-thrown to add context
          // noinspection ExceptionCaughtLocallyJS
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
    return (await backgroundRequest(requestConfig)) as AxiosResponse<TData>;
  } else {
    return (await _proxyService(
      serviceConfig,
      requestConfig
    )) as RemoteResponse<TData>;
  }
}
