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
import { appApiMock } from "@/testUtils/appApiMock";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { type IntegrationConfig } from "@/types/integrationTypes";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/services/constants";
import { readRawConfigurations } from "@/services/registry";
import { fromJS } from "@/services/factory";
import { locator } from "@/background/locator";
import aaDefinition from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import googleDefinition from "@contrib/integrations/google-oauth2-pkce.yaml";
import greenhouseDefintion from "@contrib/integrations/greenhouse.yaml";
import microsoftDefinition from "@contrib/integrations/microsoft-oauth2-pkce.yaml";
import {
  getCachedAuthData,
  setCachedAuthData,
} from "@/background/auth/authStorage";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- known valid definition
const aaIntegration = fromJS(aaDefinition as any);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- known valid definition
const googleIntegration = fromJS(googleDefinition as any);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- known valid definition
const greenhouseIntegration = fromJS(greenhouseDefintion as any);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- known valid definition
const microsoftIntegration = fromJS(microsoftDefinition as any);

jest.mock("@/background/auth/authStorage", () => ({
  getCachedAuthData: jest.fn().mockRejectedValue(new Error("Not mocked")),
  setCachedAuthData: jest.fn(),
}));

jest.mock("@/services/registry", () => {
  const actual = jest.requireActual("@/services/registry");
  return {
    ...actual,
    readRawConfigurations: jest.fn(),
  };
});

const getCachedAuthDataMock = jest.mocked(getCachedAuthData);
const setCachedAuthDataMock = jest.mocked(setCachedAuthData);
const readRawConfigurationsMock = jest.mocked(readRawConfigurations);

describe("refresh token argument validation", () => {
  it("throws if integration id's don't match", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory();

    await expect(
      refreshPKCEToken(googleIntegration, integrationConfig)
    ).rejects.toThrow("Integration id and config service id do not match");
  });

  it("throws if integration is AA OAuth2", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    });

    await expect(
      refreshPKCEToken(aaIntegration, integrationConfig)
    ).rejects.toThrow(
      `Use _refreshPartnerToken to refresh the ${CONTROL_ROOM_OAUTH_INTEGRATION_ID} token`
    );
  });

  it("throws if integration configuration is not pkce", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: greenhouseIntegration.id,
    });

    await expect(
      refreshPKCEToken(greenhouseIntegration, integrationConfig)
    ).rejects.toThrow(
      `Expected OAuth2 PKCE integration, but got ${greenhouseIntegration.id}`
    );
  });
});

describe.each([googleIntegration, microsoftIntegration])(
  "refresh PKCE token for $id",
  (integration) => {
    beforeEach(() => {
      getCachedAuthDataMock.mockReset();
      setCachedAuthDataMock.mockReset();
      readRawConfigurationsMock.mockReset();
      appApiMock.reset();
      appApiMock.resetHistory();
    });

    it("nop if no cached auth data", async () => {
      const integrationConfig = sanitizedIntegrationConfigFactory({
        serviceId: integration.id,
      });

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig
      );

      expect(isTokenRefreshed).toBe(false);
      expect(getCachedAuthDataMock).toHaveBeenCalledOnce();
    });

    it("nop if no refresh token", async () => {
      const integrationConfig = sanitizedIntegrationConfigFactory({
        serviceId: integration.id,
      });

      getCachedAuthDataMock.mockResolvedValue({
        access_token: "notatoken",
        _oauthBrand: undefined,
      });

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig
      );

      expect(isTokenRefreshed).toBe(false);
      expect(appApiMock.history.post).toHaveLength(0);
    });

    it("refreshes token with refresh token in response", async () => {
      const integrationConfig = sanitizedIntegrationConfigFactory({
        serviceId: integration.id,
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

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig
      );

      expect(isTokenRefreshed).toBe(true);
      expect(appApiMock.history.post).toHaveLength(1);
      expect(setCachedAuthDataMock).toHaveBeenCalledWith(integrationConfig.id, {
        access_token: "notatoken2",
        refresh_token: "notarefreshtoken2",
      });
    });

    it("refreshes token without refresh token in response", async () => {
      const integrationConfig = sanitizedIntegrationConfigFactory({
        serviceId: integration.id,
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

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig
      );

      expect(isTokenRefreshed).toBe(true);
      expect(appApiMock.history.post).toHaveLength(1);
      expect(setCachedAuthDataMock).toHaveBeenCalledWith(integrationConfig.id, {
        access_token: "notatoken2",
        refresh_token: "notarefreshtoken",
      });
    });

    it("throws on authorization error", async () => {
      const integrationConfig = sanitizedIntegrationConfigFactory({
        serviceId: integration.id,
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

      await expect(
        refreshPKCEToken(integration, integrationConfig)
      ).rejects.toThrow("Request failed with status code 401");
    });
  }
);
