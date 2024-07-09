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

import refreshPKCEToken from "@/background/refreshToken";
import { appApiMock } from "@/testUtils/appApiMock";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { type IntegrationConfig } from "@/integrations/integrationTypes";
import { fromJS } from "@/integrations/UserDefinedIntegration";
import { integrationConfigLocator } from "@/background/integrationConfigLocator";
import aaDefinition from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import googleDefinition from "@contrib/integrations/google-oauth2-pkce.yaml";
import greenhouseDefintion from "@contrib/integrations/greenhouse.yaml";
import microsoftDefinition from "@contrib/integrations/microsoft-oauth2-pkce.yaml";
import {
  getCachedAuthData,
  setCachedAuthData,
} from "@/background/auth/authStorage";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/integrations/constants";
import { readRawConfigurations } from "@/integrations/util/readRawConfigurations";

const aaIntegration = fromJS(aaDefinition as any);
const googleIntegration = fromJS(googleDefinition as any);
const greenhouseIntegration = fromJS(greenhouseDefintion as any);
const microsoftIntegration = fromJS(microsoftDefinition as any);

jest.mock("@/background/auth/authStorage", () => ({
  getCachedAuthData: jest.fn().mockRejectedValue(new Error("Not mocked")),
  setCachedAuthData: jest.fn(),
}));

jest.mock("@/integrations/util/readRawConfigurations");

const getCachedAuthDataMock = jest.mocked(getCachedAuthData);
const setCachedAuthDataMock = jest.mocked(setCachedAuthData);
const readRawConfigurationsMock = jest.mocked(readRawConfigurations);

describe("refresh token argument validation", () => {
  it("throws if integration id's don't match", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory();

    await expect(
      refreshPKCEToken(googleIntegration, integrationConfig),
    ).rejects.toThrow("Integration id and config service id do not match");
  });

  it("throws if integration is AA OAuth2", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    });

    await expect(
      refreshPKCEToken(aaIntegration, integrationConfig),
    ).rejects.toThrow(
      `Use refreshPartnerAuthentication to refresh the ${CONTROL_ROOM_OAUTH_INTEGRATION_ID} token`,
    );
  });

  it("throws if integration configuration is not pkce", async () => {
    const integrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: greenhouseIntegration.id,
    });

    await expect(
      refreshPKCEToken(greenhouseIntegration, integrationConfig),
    ).rejects.toThrow(
      `Expected OAuth2 PKCE integration, but got ${greenhouseIntegration.id}`,
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
        integrationConfig,
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
        _oauthBrand: null,
      });

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig,
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
        _oauthBrand: null,
      });

      readRawConfigurationsMock.mockResolvedValue([
        {
          id: integrationConfig.id,
          config: {},
        } as IntegrationConfig,
      ]);
      await integrationConfigLocator.refreshLocal();

      appApiMock.onGet("/api/services/shared/").reply(200, []);
      appApiMock.onPost().reply(200, {
        access_token: "notatoken2",
        refresh_token: "notarefreshtoken2",
      });

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig,
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
        _oauthBrand: null,
      });

      readRawConfigurationsMock.mockResolvedValue([
        {
          id: integrationConfig.id,
          config: {},
        } as IntegrationConfig,
      ]);
      await integrationConfigLocator.refreshLocal();

      appApiMock.onGet("/api/services/shared/").reply(200, []);
      appApiMock.onPost().reply(200, {
        access_token: "notatoken2",
      });

      const isTokenRefreshed = await refreshPKCEToken(
        integration,
        integrationConfig,
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
        _oauthBrand: null,
      });

      readRawConfigurationsMock.mockResolvedValue([
        {
          id: integrationConfig.id,
          config: {},
        } as IntegrationConfig,
      ]);
      await integrationConfigLocator.refreshLocal();

      appApiMock.onGet("/api/services/shared/").reply(200, []);
      appApiMock.onPost().reply(401);

      await expect(
        refreshPKCEToken(integration, integrationConfig),
      ).rejects.toThrow("Request failed with status code 401");
    });
  },
);
