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

import { registry, removeOAuth2Token } from "../../messenger/api";
import oauth2IntegrationDefinition from "@/contrib/integrations/automation-anywhere-oauth2.yaml";
import { launchAuthIntegration } from "./launchAuthIntegration";
import { appApiMock } from "../../../testUtils/appApiMock";
import { validateRegistryId } from "../../../types/helpers";
import { readRawConfigurations } from "../../../integrations/util/readRawConfigurations";
import {
  integrationConfigFactory,
  secretsConfigFactory,
} from "../../../testUtils/factories/integrationFactories";
import launchOAuth2Flow from "../launchOAuth2Flow";
import { type Metadata } from "../../../types/registryTypes";
import { setPartnerAuthData } from "@/auth/authStorage";
import { API_PATHS } from "@/data/service/urlPaths";

jest.mock("../../../integrations/util/readRawConfigurations");
const readRawConfigurationsMock = jest.mocked(readRawConfigurations);

const integrationMetaData = oauth2IntegrationDefinition.metadata as Metadata;
const integrationId = validateRegistryId(integrationMetaData.id);

jest.mocked(registry.find).mockResolvedValue({
  id: integrationId,
  config: oauth2IntegrationDefinition,
} as any);

jest.mock("../launchOAuth2Flow");
const launchOAuth2FlowMock = jest.mocked(launchOAuth2Flow);

jest.mock("../../../auth/authStorage");
const setPartnerAuthDataMock = jest.mocked(setPartnerAuthData);
const removeOAuth2TokenMock = jest.mocked(removeOAuth2Token);

describe("launchAuthIntegration", () => {
  beforeEach(() => {
    appApiMock.reset();

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .reply(200, [oauth2IntegrationDefinition]);

    appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(200, []);

    readRawConfigurationsMock.mockReset();
    launchOAuth2FlowMock.mockReset();
    setPartnerAuthDataMock.mockReset();
  });

  it("throws error if no local auths are found", async () => {
    readRawConfigurationsMock.mockResolvedValue([]);

    await expect(launchAuthIntegration({ integrationId })).rejects.toThrow(
      "No local configurations found for: " + integrationId,
    );
  });

  it("calls launchOAuth2Flow properly for AA partner integration", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
    ]);

    launchOAuth2FlowMock.mockResolvedValue({
      _oauthBrand: null,
      access_token: "test_access_token",
      refresh_token: "test_refresh_token",
    });

    appApiMock.onGet(API_PATHS.ME).reply(200, {});

    await launchAuthIntegration({ integrationId });

    expect(launchOAuth2FlowMock).toHaveBeenCalledTimes(1);
    expect(launchOAuth2FlowMock).toHaveBeenCalledWith(
      // UserDefinedIntegration
      expect.objectContaining(integrationMetaData),
      // IntegrationConfig
      expect.objectContaining({
        config: expect.objectContaining({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
      // Interactive option
      { interactive: true },
    );
  });

  it("throws error if controlRoomUrl is missing from the configuration", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory(),
      }),
    ]);

    await expect(launchAuthIntegration({ integrationId })).rejects.toThrow(
      "controlRoomUrl is missing on configuration",
    );
  });

  it("throws error if controlRoomURl is malformed in the configuration", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "malformed-url",
        }),
      }),
    ]);

    await expect(launchAuthIntegration({ integrationId })).rejects.toThrow(
      "controlRoomUrl is missing on configuration",
    );
  });

  it("throws error if access_token is missing from launchOAuth2Flow result", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
    ]);

    launchOAuth2FlowMock.mockResolvedValue({
      _oauthBrand: null,
    });

    await expect(launchAuthIntegration({ integrationId })).rejects.toThrow(
      "access_token not found in launchOAuth2Flow() result for Control Room login",
    );
  });

  it("on successful launchOAuth2Flow result, makes the correct api call to check the token", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
    ]);

    launchOAuth2FlowMock.mockResolvedValue({
      _oauthBrand: null,
      access_token: "test_access_token",
      refresh_token: "test_refresh_token",
    });

    appApiMock.onGet(API_PATHS.ME).reply(200, {});

    await launchAuthIntegration({ integrationId });

    expect(appApiMock.history.get).toBeArrayOfSize(1);
    expect(appApiMock.history.get[0]!.url).toBe(API_PATHS.ME);
  });

  it("when the token check fails with an auth error, clears the oauth2 token and throws rejected error", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
    ]);

    launchOAuth2FlowMock.mockResolvedValue({
      _oauthBrand: null,
      access_token: "test_access_token",
      refresh_token: "test_refresh_token",
    });

    appApiMock.onGet(API_PATHS.ME).reply(401, {});

    await expect(launchAuthIntegration({ integrationId })).rejects.toThrow(
      "Control Room rejected login",
    );
    expect(removeOAuth2TokenMock).toHaveBeenCalledTimes(1);
    expect(removeOAuth2TokenMock).toHaveBeenCalledWith("test_access_token");
  });

  it("sets the partner auth data correctly when refresh token is included", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
    ]);

    launchOAuth2FlowMock.mockResolvedValue({
      _oauthBrand: null,
      access_token: "test_access_token",
      refresh_token: "test_refresh_token",
    });

    appApiMock.onGet(API_PATHS.ME).reply(200, {});

    await launchAuthIntegration({ integrationId });

    expect(setPartnerAuthDataMock).toHaveBeenCalledTimes(1);
    expect(setPartnerAuthDataMock).toHaveBeenCalledWith({
      authId: expect.toBeString(), // Generated UUID
      token: "test_access_token",
      refreshToken: "test_refresh_token",
      // These values come from automation-anywhere-oauth2.yaml, they were logged by running the test and then copied here
      refreshUrl:
        "https://oauthconfigapp.automationanywhere.digital/client/oauth/token",
      refreshParamPayload: {
        grant_type: "refresh_token",
        client_id: "g2qrB2fvyLYbotkb3zi9wwO5qjmje3eM",
        hosturl: "https://control-room.example.com",
        refresh_token: "test_refresh_token",
      },
      refreshExtraHeaders: {
        Authorization: "Basic ZzJxckIyZnZ5TFlib3RrYjN6aTl3d081cWptamUzZU0=",
      },
      extraHeaders: {
        "X-Control-Room": "https://control-room.example.com",
      },
    });
  });

  it("sets the partner auth data correctly without a refresh token", async () => {
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
        }),
      }),
    ]);

    launchOAuth2FlowMock.mockResolvedValue({
      _oauthBrand: null,
      access_token: "test_access_token",
    });

    appApiMock.onGet(API_PATHS.ME).reply(200, {});

    await launchAuthIntegration({ integrationId });

    expect(setPartnerAuthDataMock).toHaveBeenCalledTimes(1);
    expect(setPartnerAuthDataMock).toHaveBeenCalledWith({
      authId: expect.toBeString(), // Generated UUID
      token: "test_access_token",
      refreshToken: null,
      refreshUrl: null,
      refreshParamPayload: null,
      refreshExtraHeaders: null,
      extraHeaders: {
        "X-Control-Room": "https://control-room.example.com",
      },
    });
  });
});
