/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import refreshPKCEToken from "@/background/refreshToken";
import { getCachedAuthData, setCachedAuthData } from "@/background/auth";
import { appApiMock } from "@/testUtils/appApiMock";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { type IntegrationConfig } from "@/types/integrationTypes";
import { readRawConfigurations } from "@/services/registry";
import { registry } from "@/background/messenger/api";
import googleDefinition from "@contrib/integrations/google-oauth2-pkce.yaml";
import { locator } from "@/background/locator";

const PKCE_INTEGRATION_ID = (googleDefinition.metadata as any).id;

jest.mock("@/background/auth", () => ({
  getCachedAuthData: jest.fn().mockRejectedValue(new Error("Not mocked")),
  setCachedAuthData: jest.fn(),
}));

jest.mock("@/services/registry", () => {
  const actual = jest.requireActual("@/services/registry");
  return {
    // Include __esModule so default export works
    __esModule: true,
    ...actual,
    readRawConfigurations: jest.fn().mockResolvedValue([]),
  };
});

// Module mocked via __mocks__/@/background/messenger/api
jest.mocked(registry.find).mockImplementation(
  async () =>
    ({
      id: PKCE_INTEGRATION_ID,
      config: googleDefinition,
    } as any)
);

const getCachedAuthDataMock = jest.mocked(getCachedAuthData);
const setCachedAuthDataMock = jest.mocked(setCachedAuthData);
const readRawConfigurationsMock = jest.mocked(readRawConfigurations);

describe("refresh PKCE token", () => {
  beforeEach(() => {
    getCachedAuthDataMock.mockReset();
    setCachedAuthDataMock.mockReset();
    readRawConfigurationsMock.mockReset();
    appApiMock.reset();
    appApiMock.resetHistory();
  });

  it("nop if no cached auth data", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: PKCE_INTEGRATION_ID,
    });

    const isTokenRefreshed = await refreshPKCEToken(integrationConfig);

    expect(isTokenRefreshed).toBe(false);
    expect(getCachedAuthDataMock).toHaveBeenCalledOnce();
  });

  it("nop if no refresh token", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: PKCE_INTEGRATION_ID,
    });

    getCachedAuthDataMock.mockResolvedValue({
      access_token: "notatoken",
      _oauthBrand: undefined,
    });

    const isTokenRefreshed = await refreshPKCEToken(integrationConfig);

    expect(isTokenRefreshed).toBe(false);
    expect(appApiMock.history.post).toHaveLength(0);
  });

  it("refreshes token with refresh token in response", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: PKCE_INTEGRATION_ID,
    });

    getCachedAuthDataMock.mockResolvedValue({
      access_token: "notatoken",
      refresh_token: "notarefreshtoken",
      _oauthBrand: undefined,
    });

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: integrationConfig.id,
        config: {},
      } as IntegrationConfig,
    ]);
    await locator.refreshLocal();

    appApiMock.onGet("/api/services/shared/").reply(200, []);
    appApiMock.onPost().reply(200, {
      access_token: "notatoken2",
      refresh_token: "notarefreshtoken2",
    });

    const isTokenRefreshed = await refreshPKCEToken(integrationConfig);

    expect(isTokenRefreshed).toBe(true);
    expect(appApiMock.history.post).toHaveLength(1);
    expect(setCachedAuthDataMock).toHaveBeenCalledWith(integrationConfig.id, {
      access_token: "notatoken2",
      refresh_token: "notarefreshtoken2",
    });
  });

  it("refreshes token without refresh token in response", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: PKCE_INTEGRATION_ID,
    });

    getCachedAuthDataMock.mockResolvedValue({
      access_token: "notatoken",
      refresh_token: "notarefreshtoken",
      _oauthBrand: undefined,
    });

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: integrationConfig.id,
        config: {},
      } as IntegrationConfig,
    ]);
    await locator.refreshLocal();

    appApiMock.onGet("/api/services/shared/").reply(200, []);
    appApiMock.onPost().reply(200, {
      access_token: "notatoken2",
    });

    const isTokenRefreshed = await refreshPKCEToken(integrationConfig);

    expect(isTokenRefreshed).toBe(true);
    expect(appApiMock.history.post).toHaveLength(1);
    expect(setCachedAuthDataMock).toHaveBeenCalledWith(integrationConfig.id, {
      access_token: "notatoken2",
      refresh_token: "notarefreshtoken",
    });
  });

  it("throws on authorization error", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: PKCE_INTEGRATION_ID,
    });

    getCachedAuthDataMock.mockResolvedValue({
      access_token: "notatoken",
      refresh_token: "notarefreshtoken",
      _oauthBrand: undefined,
    });

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: integrationConfig.id,
        config: {},
      } as IntegrationConfig,
    ]);
    await locator.refreshLocal();

    appApiMock.onGet("/api/services/shared/").reply(200, []);
    appApiMock.onPost().reply(401);

    await expect(refreshPKCEToken(integrationConfig)).rejects.toThrow(
      "Request failed with status code 401"
    );
  });
});
