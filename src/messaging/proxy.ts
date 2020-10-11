import { request } from "@/background/requests";
import { pixieServiceFactory } from "@/services/locator";
import { RemoteServiceError } from "@/services/errors";
import { getBaseURL } from "@/services/baseService";
import { AxiosRequestConfig, Method } from "axios";
import { ConfiguredService } from "@/core";
import { isBackgroundPage } from "webext-detect-page";

export interface RemoteResponse<T> {
  data: T;
  status: number;
  statusText: string;
  __proxied?: boolean;
}

async function proxyRequest<T>(
  service: ConfiguredService,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse<T>> {
  const proxyService = await pixieServiceFactory();
  const baseURL = await getBaseURL();
  const proxyRequest = {
    url: `${baseURL}/api/proxy/`,
    method: "post" as Method,
    data: {
      ...requestConfig,
      service_id: service.serviceId,
    },
  };
  const proxyResponse = await request(
    proxyService.authenticateRequest(proxyRequest)
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
      __proxied: true,
    };
  }
}

export async function proxyService<T>(
  service: ConfiguredService | null,
  requestConfig: AxiosRequestConfig
): Promise<RemoteResponse<T>> {
  if (!service) {
    return await request(requestConfig);
  } else if (service.proxy) {
    return await proxyRequest<T>(service, requestConfig);
  } else {
    if (!isBackgroundPage()) {
      throw new Error(
        "proxyService can only authenticate requests from the background page"
      );
    }
    return await request(service.authenticateRequest(requestConfig));
  }
}
