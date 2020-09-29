import { safeRequest } from "@/chrome";
import { pixieServiceFactory } from "@/services/locator";
import { RemoteServiceError } from "@/services/errors";
import { getBaseURL } from "@/services/baseService";
import { AxiosRequestConfig, Method } from "axios";
import { ConfiguredService } from "@/core";

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
  const proxyResponse: any = await safeRequest(
    proxyService.authenticateRequest(proxyRequest)
  );
  console.debug(`Proxy response for ${service.serviceId}:`, proxyResponse);
  if (proxyResponse.status_code >= 400) {
    throw new RemoteServiceError(
      proxyResponse.message ?? proxyResponse.reason,
      proxyResponse
    );
  } else {
    return proxyResponse.json;
  }
}

export async function proxyService(
  service: ConfiguredService | null,
  requestConfig: AxiosRequestConfig
): Promise<unknown> {
  if (!service) {
    return await safeRequest(requestConfig);
  } else if (service.proxy) {
    return await proxyRequest(service, requestConfig);
  } else {
    return await safeRequest(service.authenticateRequest(requestConfig));
  }
}
