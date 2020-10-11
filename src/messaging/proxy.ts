import { request } from "@/background/requests";
import { pixieServiceFactory } from "@/services/locator";
import { RemoteServiceError } from "@/services/errors";
import { getBaseURL } from "@/services/baseService";
import { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { ConfiguredService } from "@/core";

interface ProxyResponse {
  status_code: number;
  message?: string;
  reason?: string;
  json?: unknown;
}

async function proxyRequest(
  service: ConfiguredService,
  requestConfig: AxiosRequestConfig
): Promise<unknown> {
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
  const proxyResponse = (await request(
    proxyService.authenticateRequest(proxyRequest)
  )) as AxiosResponse<ProxyResponse>;
  console.debug(`Proxy response for ${service.serviceId}:`, proxyResponse);
  if (proxyResponse.data.status_code >= 400) {
    throw new RemoteServiceError(
      proxyResponse.data.message ?? proxyResponse.data.reason,
      proxyResponse
    );
  } else {
    return proxyResponse.data.json;
  }
}

export async function proxyService(
  service: ConfiguredService | null,
  requestConfig: AxiosRequestConfig
): Promise<unknown> {
  if (!service) {
    return await request(requestConfig);
  } else if (service.proxy) {
    return await proxyRequest(service, requestConfig);
  } else {
    return await request(service.authenticateRequest(requestConfig));
  }
}
