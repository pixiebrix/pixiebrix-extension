/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import integrationRegistry from "@/integrations/registry";
import axios, { type AxiosError } from "axios";
import MockAdapter from "axios-mock-adapter";
import { performConfiguredRequest } from "./requests";
import * as token from "@/auth/authStorage";
import Locator from "@/integrations/integrationConfigLocator";
import { validateRegistryId } from "@/types/helpers";
import enrichAxiosErrors from "@/utils/enrichAxiosErrors";
import { ContextError } from "@/errors/genericErrors";
import { RemoteServiceError } from "@/errors/clientRequestErrors";
import {
  type IntegrationABC,
  type IntegrationConfig,
  type SecretsConfig,
} from "@/integrations/integrationTypes";
import { TEST_setContext } from "webext-detect";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { getToken } from "@/background/auth/getToken";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import { hasSpecificErrorCause } from "@/errors/errorHelpers";
import { InteractiveLoginRequiredError } from "@/errors/authErrors";
import { deserializeError, serializeError } from "serialize-error";
import { type NetworkRequestConfig } from "@/types/networkTypes";

// Disable automatic __mocks__ resolution #6799
jest.mock("@/data/service/apiClient", () =>
  jest.requireActual("@/data/service/apiClient.ts"),
);

browser.identity = {
  launchWebAuthFlow: jest.fn(),
  getRedirectURL: jest.fn(),
};

TEST_setContext("background");

const axiosMock = new MockAdapter(axios);
const mockGetToken = jest.mocked(getToken);
const launchWebAuthFlowMock = jest.mocked(browser.identity.launchWebAuthFlow);

browser.permissions.contains = jest.fn().mockResolvedValue(true);

jest.mock("@/background/auth/authStorage", () => ({
  getCachedAuthData: jest.fn().mockResolvedValue(null),
  hasCachedAuthData: jest.fn().mockResolvedValue(false),
  deleteCachedAuthData: jest.fn(),
}));
jest.mock("@/background/auth/getToken", () => ({
  __esModule: true,
  getToken: jest.fn().mockResolvedValue({ token: "iamatoken" }),
}));
jest.mock("@/auth/authStorage");
jest.mock("@/integrations/integrationConfigLocator");

enrichAxiosErrors();

afterEach(() => {
  axiosMock.reset();
  axiosMock.resetHistory();
  jest.mocked(Locator).mockClear();
});

jest.mocked(token.getExtensionToken).mockResolvedValue("abc123");

const EXAMPLE_SERVICE_API = validateRegistryId("example/api");
const EXAMPLE_SERVICE_PKCE_API = validateRegistryId("example/pkce");
const EXAMPLE_SERVICE_TOKEN_API = validateRegistryId("example/token");

integrationRegistry.register([
  {
    id: PIXIEBRIX_INTEGRATION_ID,
    authenticateRequest: (
      serviceConfig: SecretsConfig,
      requestConfig: NetworkRequestConfig,
    ) => requestConfig,
  },
  {
    id: EXAMPLE_SERVICE_API,
    authenticateRequest: (
      serviceConfig: SecretsConfig,
      requestConfig: NetworkRequestConfig,
    ) => requestConfig,
  },
  {
    id: EXAMPLE_SERVICE_TOKEN_API,
    authenticateRequest: (
      serviceConfig: SecretsConfig,
      requestConfig: NetworkRequestConfig,
    ) => requestConfig,
    isToken: true,
  },
  {
    id: EXAMPLE_SERVICE_PKCE_API,
    authenticateRequest: (
      serviceConfig: SecretsConfig,
      requestConfig: NetworkRequestConfig,
    ) => requestConfig,
    getOAuth2Context: () => ({
      host: "example.com",
      authorizeUrl: "https://example.com/authorize",
      tokenUrl: "https://example.com/token",
      clientId: "abc123",
      redirectUri: "https://example.com/redirect",
    }),
    isOAuth2PKCE: true,
    isOAuth2: true,
  },
] as unknown[] as IntegrationABC[]);

const requestConfig: NetworkRequestConfig = {
  url: "https://www.example.com",
  method: "get",
};

const directIntegrationConfig = sanitizedIntegrationConfigFactory({
  proxy: false,
  serviceId: EXAMPLE_SERVICE_API,
});

const directTokenIntegrationConfig = sanitizedIntegrationConfigFactory({
  proxy: false,
  serviceId: EXAMPLE_SERVICE_TOKEN_API,
});

const proxiedIntegrationConfig = sanitizedIntegrationConfigFactory({
  proxy: true,
  serviceId: EXAMPLE_SERVICE_API,
});

const pkceIntegrationConfig = sanitizedIntegrationConfigFactory({
  proxy: false,
  serviceId: EXAMPLE_SERVICE_PKCE_API,
});

describe("unauthenticated direct requests", () => {
  it("makes an unauthenticated request", async () => {
    axiosMock.onAny().reply(200, {});
    const { status } = await performConfiguredRequest(null, requestConfig, {
      interactiveLogin: false,
    });
    expect(status).toBe(200);
  });

  it("requires absolute URL for unauthenticated requests", async () => {
    await expect(async () => {
      await performConfiguredRequest(
        null,
        {
          url: "api/foo/",
        },
        { interactiveLogin: false },
      );
    }).rejects.toThrow(/expected absolute URL for request without integration/);
  });

  it("handles remote internal server error", async () => {
    axiosMock.onAny().reply(500);

    const request = performConfiguredRequest(null, requestConfig, {
      interactiveLogin: false,
    });
    await expect(request).rejects.toThrow(RemoteServiceError);
    await expect(request).rejects.toHaveProperty("cause.response.status", 500);
  });
});

describe("authenticated direct requests", () => {
  beforeEach(() => {
    jest
      .spyOn(Locator.prototype, "findSanitizedIntegrationConfig")
      .mockResolvedValue(directIntegrationConfig);
    jest
      .spyOn(Locator.prototype, "findIntegrationConfig")
      .mockResolvedValue(
        directIntegrationConfig as unknown as IntegrationConfig,
      );
  });

  it("makes an authenticated request", async () => {
    axiosMock.onAny().reply(200, {});
    const response = await performConfiguredRequest(
      directIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );
    expect(response.status).toBe(200);
  });

  it("throws on missing local config", async () => {
    jest.spyOn(Locator.prototype, "findIntegrationConfig").mockReset();

    await expect(async () =>
      performConfiguredRequest(directIntegrationConfig, requestConfig, {
        interactiveLogin: false,
      }),
    ).rejects.toThrow("Local integration configuration not found:");
  });

  it("throws error on bad request", async () => {
    axiosMock.onAny().reply(403, {});

    const request = performConfiguredRequest(
      directIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );

    await expect(request).rejects.toThrow(ContextError);
    await expect(request).rejects.toMatchObject({
      cause: new RemoteServiceError("Forbidden", { cause: {} as AxiosError }),
    });
    await expect(request).rejects.toHaveProperty(
      "cause.cause.response.status",
      403,
    );
  });
});

describe("interactive", () => {
  it("throws on interactive: false if no cached auth data", async () => {
    jest
      .spyOn(Locator.prototype, "findIntegrationConfig")
      .mockResolvedValue(pkceIntegrationConfig as any);

    launchWebAuthFlowMock.mockRejectedValue(
      new Error("User interaction required. Blah blah blah"),
    );

    const request = performConfiguredRequest(
      pkceIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );

    await expect(request).rejects.toThrow(ContextError);

    try {
      await request;
    } catch (error) {
      // We're using the InteractiveLoginRequiredError error type for control flow. Test that it doesn't swallow
      // the InteractiveLoginRequiredError event if it crosses the messenger boundary
      expect(
        hasSpecificErrorCause(error, InteractiveLoginRequiredError),
      ).toBeTrue();
      expect(
        hasSpecificErrorCause(
          serializeError(error),
          InteractiveLoginRequiredError,
        ),
      ).toBeTrue();
      expect(
        hasSpecificErrorCause(
          deserializeError(serializeError(error)),
          InteractiveLoginRequiredError,
        ),
      ).toBeTrue();
    }
  });
});

describe("proxy service requests", () => {
  it("can proxy request", async () => {
    axiosMock.onAny().reply(200, {
      json: { foo: 42 },
      status_code: 200,
    });
    const { status, data } = await performConfiguredRequest(
      proxiedIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );
    expect(JSON.parse(String(axiosMock.history.post[0]!.data))).toEqual({
      ...requestConfig,
      service_id: EXAMPLE_SERVICE_API,
      auth_id: proxiedIntegrationConfig.id,
    });
    expect(status).toBe(200);
    expect(data).toEqual({ foo: 42 });
  });

  describe.each([[400], [401], [403], [405], [500]])(
    "remote status: %s",
    (statusCode) => {
      it("can proxy remote error", async () => {
        const reason = "Bad request";

        axiosMock.onAny().reply(200, {
          json: {},
          reason,
          status_code: statusCode,
        });

        const request = performConfiguredRequest(
          proxiedIntegrationConfig,
          requestConfig,
          { interactiveLogin: false },
        );

        await expect(request).rejects.toThrow(ContextError);
        await expect(request).rejects.toMatchObject({
          cause: {
            response: {
              status: statusCode,
              statusText: reason,
            },
          },
        });
      });
    },
  );

  it("handle proxy error", async () => {
    axiosMock.onAny().reply(500);
    const request = performConfiguredRequest(
      proxiedIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );

    await expect(request).rejects.toThrow(ContextError);
    await expect(request).rejects.toMatchObject({
      cause: {
        name: "RemoteServiceError",
        message: "Internal Server Error",
        cause: {
          response: {
            status: 500,
          },
        },
      },
    });
  });

  it("handle network error", async () => {
    axiosMock.onAny().networkError();
    const request = performConfiguredRequest(
      proxiedIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );

    await expect(request).rejects.toThrow(ContextError);
    await expect(request).rejects.toMatchObject({
      cause: {
        name: "ClientNetworkError",
        message: expect.stringMatching(/^No response received/),
      },
    });
  });
});

describe("Retry token request", () => {
  beforeEach(() => {
    mockGetToken.mockClear();
    jest
      .spyOn(Locator.prototype, "findSanitizedIntegrationConfig")
      .mockResolvedValue(directTokenIntegrationConfig);
    jest
      .spyOn(Locator.prototype, "findIntegrationConfig")
      .mockResolvedValue(
        directTokenIntegrationConfig as unknown as IntegrationConfig,
      );
  });

  it.each([[401], [403]])(
    "Handles expired token for %d response",
    async (statusCode) => {
      axiosMock.onGet(requestConfig.url).reply(statusCode, {});
      const response = performConfiguredRequest(
        directTokenIntegrationConfig,
        requestConfig,
        { interactiveLogin: false },
      );
      await expect(response).rejects.toThrow(ContextError);
      // Once on the initial call b/c no cached auth data, and once for the retry
      expect(mockGetToken).toHaveBeenCalledTimes(2);
    },
  );

  it("Handles expired AA token", async () => {
    axiosMock
      .onGet(requestConfig.url)
      .reply(400, { message: "Access Token has expired" });
    const response = performConfiguredRequest(
      directTokenIntegrationConfig,
      requestConfig,
      { interactiveLogin: false },
    );
    await expect(response).rejects.toThrow(ContextError);
    // Once on the initial call b/c no cached auth data, and once for the retry
    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });
});
