/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { SanitizedServiceConfiguration, ServiceConfig } from "@/core";
import { pixieServiceFactory } from "@/services/locator";
import { RemoteServiceError } from "@/services/errors";
import serviceRegistry from "@/services/registry";
import { getExtensionToken } from "@/auth/token";
import { locator } from "@/background/locator";
import {
  ContextError,
  ExtensionNotLinkedError,
  getErrorMessage,
  isAxiosError,
  selectError,
} from "@/errors";
import { isEmpty } from "lodash";
import {
  deleteCachedAuthData,
  getCachedAuthData,
  getToken,
  launchOAuth2Flow,
} from "@/background/auth";
import { isAbsoluteUrl } from "@/utils";
import { expectContext } from "@/utils/expectContext";
import { absoluteApiUrl } from "@/services/apiClient";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

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

export async function doCleanAxiosRequest<T>(
  config: AxiosRequestConfig
): Promise<SanitizedResponse<T>> {
  // Network requests must go through background page for permissions/CORS to work properly
  expectContext(
    "background",
    "Network requests must be made from the background page"
  );

  try {
    const { data, status, statusText } = await axios(config);

    // Firefox won't send response objects from the background page to the content script. So strip out the
    // potentially sensitive parts of the response (the request, headers, etc.)
    return JSON.parse(JSON.stringify({ data, status, statusText }));
  } catch (error) {
    if (isAxiosError(error)) {
      // Axios offers its own serialization method, but it doesn't include the response.
      // By deleting toJSON, the serialize-error library will use its default serialization
      delete error.toJSON;
    }

    console.trace("Error performing request from background page", { error });
    throw error;
  }
}

async function authenticate(
  config: SanitizedServiceConfiguration,
  request: AxiosRequestConfig
): Promise<AxiosRequestConfig> {
  expectContext("background");

  if (config == null) {
    throw new Error("config is required for authenticate");
  }

  const service = await serviceRegistry.lookup(config.serviceId);

  if (service.id === PIXIEBRIX_SERVICE_ID) {
    const apiKey = await getExtensionToken();
    if (!apiKey) {
      throw new ExtensionNotLinkedError();
    }

    return service.authenticateRequest(
      ({ apiKey } as unknown) as ServiceConfig,
      {
        ...request,
        url: await absoluteApiUrl(request.url),
      }
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
  if (service == null) {
    throw new Error("service is required for proxyRequest");
  }

  console.debug(`Proxying request for ${service.id}`);

  const authenticatedRequestConfig = await authenticate(
    await pixieServiceFactory(),
    {
      url: await absoluteApiUrl("/api/proxy/"),
      method: "post" as Method,
      data: {
        ...requestConfig,
        auth_id: service.id,
        service_id: service.serviceId,
      },
    }
  );

  let proxyResponse;
  try {
    proxyResponse = await doCleanAxiosRequest<ProxyResponseData>(
      authenticatedRequestConfig
    );
  } catch (error) {
    // If there's a server error with the proxy server itself, we'll also see it in the Rollbar logs for the server.
    throw new Error(`API proxy error: ${getErrorMessage(error)}`);
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
  }

  // The json payload from the proxy is the response from the remote server
  return {
    data: remoteResponse.json as T,
    status: remoteResponse.status_code,
    $$proxied: true,
  };
}

const UNAUTHORIZED_STATUS_CODES = [401, 403];

async function _proxyService(
  serviceConfig: SanitizedServiceConfiguration,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse> {
  if (serviceConfig.proxy) {
    // Service uses the PixieBrix remote proxy to perform authentication. Proxy the request.
    return proxyRequest(serviceConfig, requestConfig);
  }

  try {
    return await doCleanAxiosRequest(
      await authenticate(serviceConfig, requestConfig)
    );
  } catch (error) {
    // Try again - have the user login again, or automatically try to get a new token
    if (
      isAxiosError(error) &&
      UNAUTHORIZED_STATUS_CODES.includes(error.response?.status)
    ) {
      const service = await serviceRegistry.lookup(serviceConfig.serviceId);
      if (service.isOAuth2 || service.isToken) {
        await deleteCachedAuthData(serviceConfig.id);
        return doCleanAxiosRequest(
          await authenticate(serviceConfig, requestConfig)
        );
      }
    }

    console.debug(
      "Error occurred when making a request from the background page",
      { error }
    );

    throw error;
  }
}

/**
 * Perform an request either directly, or via the PixieBrix authentication proxy
 * @param serviceConfig the PixieBrix service configuration (used to locate the full configuration)
 * @param requestConfig the unauthenticated axios request configuration
 */
export async function proxyService<TData>(
  serviceConfig: SanitizedServiceConfiguration | null,
  requestConfig: AxiosRequestConfig
  // Note: This signature is ignored by `webext-messenger`
  // so it must be copied into `background/messenger/api.ts`
): Promise<RemoteResponse<TData>> {
  if (serviceConfig != null && typeof serviceConfig !== "object") {
    throw new Error("expected configured service for serviceConfig");
  }

  if (!serviceConfig) {
    // No service configuration provided. Perform request directly without authentication
    if (!isAbsoluteUrl(requestConfig.url) && requestConfig.baseURL == null) {
      throw new Error("expected absolute URL for request without service");
    }

    try {
      return await doCleanAxiosRequest<TData>(requestConfig);
    } catch (error) {
      if (!isAxiosError(error)) {
        throw error;
      }

      if (error.response) {
        throw new RemoteServiceError(error.response.statusText, error.response);
      }

      // XXX: most likely the browser blocked the network request (or perhaps the response timed out)
      console.error(error);
      throw new RemoteServiceError(
        "No response received; see browser network log for error."
      );
    }
  }

  try {
    return (await _proxyService(
      serviceConfig,
      requestConfig
    )) as RemoteResponse<TData>;
  } catch (error) {
    throw new ContextError(selectError(error) as Error, {
      serviceId: serviceConfig.serviceId,
      authId: serviceConfig.id,
    });
  }
}
