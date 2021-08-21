/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { liftBackground } from "@/background/protocol";
import { SanitizedServiceConfiguration, ServiceConfig } from "@/core";
import { pixieServiceFactory } from "@/services/locator";
import { RemoteServiceError } from "@/services/errors";
import serviceRegistry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import { getExtensionToken } from "@/auth/token";
import { locator } from "@/background/locator";
import { ContextError, ExtensionNotLinkedError, isAxiosError } from "@/errors";
import { isEmpty } from "lodash";
import {
  deleteCachedAuthData,
  getCachedAuthData,
  getToken,
  launchOAuth2Flow,
} from "@/background/auth";
import { isAbsoluteURL } from "@/hooks/fetch";
import { expectBackgroundPage } from "@/utils/expectContext";
import { absoluteApiUrl } from "@/services/apiClient";

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

function proxyResponseToAxiosResponse(data: ProxyResponseData) {
  if (isErrorResponse(data)) {
    return {
      data: data.json,
      status: data.status_code,
      statusText: data.reason ?? data.message,
    } as AxiosResponse;
  }

  return {
    data: data.json,
    status: data.status_code,
  } as AxiosResponse;
}

function isErrorResponse(
  data: ProxyResponseData
): data is ProxyResponseErrorData {
  return data.status_code >= 400;
}

interface SanitizedResponse<T = unknown> {
  _sanitizedResponseBrand: null;
  data: T;
  status: number;
  statusText: string;
}

function cleanResponse<T>(response: AxiosResponse<T>): SanitizedResponse<T> {
  // Firefox won't send response objects from the background page to the content script. So strip out the
  // potentially sensitive parts of the response (the request, headers, etc.)
  return JSON.parse(
    JSON.stringify({
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    })
  );
}

const backgroundRequest = liftBackground(
  "HTTP_REQUEST",
  async (config: AxiosRequestConfig) => {
    try {
      return cleanResponse(await axios(config));
      // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
    } catch (error) {
      // Axios offers its own serialization method, but it doesn't include the response.
      // By deleting toJSON, the serialize-error library will use its default serialization
      console.trace("Error performing request from background page", { error });
      delete error.toJSON;
      throw error;
    }
  }
);

export const deleteCachedAuth = liftBackground(
  "DELETE_CACHED_AUTH",
  async (authId: string) => {
    await deleteCachedAuthData(authId);
  }
);

async function authenticate(
  config: SanitizedServiceConfiguration,
  request: AxiosRequestConfig
): Promise<AxiosRequestConfig> {
  expectBackgroundPage();

  const service = await serviceRegistry.lookup(config.serviceId);

  if (service.id === PIXIEBRIX_SERVICE_ID) {
    const apiKey = await getExtensionToken();
    if (!apiKey) {
      throw new ExtensionNotLinkedError();
    }

    return service.authenticateRequest(
      ({ apiKey } as unknown) as ServiceConfig,
      { ...request, url: await absoluteApiUrl(request.url) }
    );
  }

  if (service.isOAuth2) {
    const localConfig = await locator.getLocalConfig(config.id);
    let data = await getCachedAuthData(config.id);
    if (isEmpty(data)) {
      data = await launchOAuth2Flow(service, localConfig);
    }

    return service.authenticateRequest(localConfig.config, request, data);
  }

  if (service.isToken) {
    const localConfig = await locator.getLocalConfig(config.id);
    let data = await getCachedAuthData(config.id);
    if (isEmpty(data)) {
      console.debug(
        `Fetching token for ${config.id} because no auth cached locally`
      );
      data = await getToken(service, localConfig);
    }

    if (isEmpty(data)) {
      throw new Error("No auth data found for token authentication");
    }

    return service.authenticateRequest(localConfig.config, request, data);
  }

  const localConfig = await locator.getLocalConfig(config.id);
  return service.authenticateRequest(localConfig.config, request);
}

async function proxyRequest<T>(
  service: SanitizedServiceConfiguration,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse<T>> {
  console.debug(`Proxying request for ${service.id}`);
  let proxyResponse;
  try {
    proxyResponse = (await backgroundRequest(
      await authenticate(await pixieServiceFactory(), {
        url: await absoluteApiUrl("/api/proxy/"),
        method: "post" as Method,
        data: {
          ...requestConfig,
          auth_id: service.id,
          service_id: service.serviceId,
        },
      })
    )) as SanitizedResponse<ProxyResponseData>;
  } catch {
    throw new Error("An error occurred when proxying the service request");
  }

  const { data: remoteResponse } = proxyResponse;
  console.debug(`Proxy response for ${service.serviceId}:`, proxyResponse);

  if (isErrorResponse(remoteResponse)) {
    throw new RemoteServiceError(
      remoteResponse.message ?? remoteResponse.reason,
      // FIXME: should fix the type of RemoteServiceError to support incomplete responses, e.g., because
      //  the proxy doesn't return header information from the remote service
      proxyResponseToAxiosResponse(remoteResponse)
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

const UNAUTHORIZED_STATUS_CODES = [401, 403];

const _proxyService = liftBackground(
  "PROXY",
  async (
    serviceConfig: SanitizedServiceConfiguration,
    requestConfig: AxiosRequestConfig
  ): Promise<RemoteResponse> => {
    if (serviceConfig.proxy) {
      // Service uses the PixieBrix remote proxy to perform authentication. Proxy the request.
      return proxyRequest(serviceConfig, requestConfig);
    }

    try {
      return await backgroundRequest(
        await authenticate(serviceConfig, requestConfig)
      );
      // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
    } catch (error) {
      if (UNAUTHORIZED_STATUS_CODES.includes(error.response?.status)) {
        // Try again - have the user login again, or automatically try to get a new token
        const service = await serviceRegistry.lookup(serviceConfig.serviceId);
        if (service.isOAuth2 || service.isToken) {
          await deleteCachedAuthData(serviceConfig.id);
          return backgroundRequest(
            await authenticate(serviceConfig, requestConfig)
          );
        }
      }

      console.debug(
        "Error occurred when making a request from the background page",
        { error }
      );
      // Caught outside to add additional context to the exception
      // noinspection ExceptionCaughtLocallyJS
      throw error;
    }
  }
);

export async function proxyService<TData>(
  serviceConfig: SanitizedServiceConfiguration | null,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse<TData>> {
  if (serviceConfig != null && typeof serviceConfig !== "object") {
    throw new Error("expected configured service for serviceConfig");
  } else if (!serviceConfig) {
    // No service configuration provided. Perform request directly without authentication
    if (!isAbsoluteURL(requestConfig.url) && requestConfig.baseURL == null) {
      throw new Error("expected absolute URL for request without service");
    }

    try {
      return (await backgroundRequest(
        requestConfig
      )) as SanitizedResponse<TData>;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        if (error.response) {
          throw new RemoteServiceError(
            error.response.statusText,
            error.response
          );
        } else {
          // XXX: most likely the browser blocked the network request (or perhaps the response timed out)
          const msg =
            "No response received; see browser network log for error.";
          console.error(msg);
          throw new RemoteServiceError(msg, null);
        }
      }

      throw error;
    }
  }

  try {
    return (await _proxyService(
      serviceConfig,
      requestConfig
    )) as RemoteResponse<TData>;
    // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
  } catch (error) {
    throw new ContextError(error, {
      serviceId: serviceConfig.serviceId,
      authId: serviceConfig.id,
    });
  }
}
