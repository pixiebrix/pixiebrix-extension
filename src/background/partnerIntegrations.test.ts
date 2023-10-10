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

import {
  _refreshPartnerToken,
  getPartnerPrincipals,
} from "@/background/partnerIntegrations";
import { readRawConfigurations } from "@/services/registry";
import tokenIntegrationDefinition from "@contrib/integrations/automation-anywhere.yaml";
import oauthIntegrationDefinition from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import { locator as serviceLocator } from "@/background/locator";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "@/services/constants";
import { uuidv4 } from "@/types/helpers";
import { readPartnerAuthData, setPartnerAuth } from "@/auth/token";
import { syncRemotePackages } from "@/registry/memoryRegistry";
import { type RegistryId } from "@/types/registryTypes";
import { type IntegrationConfig } from "@/types/integrationTypes";
import {
  integrationConfigFactory,
  secretsConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { appApiMock } from "@/testUtils/appApiMock";
import { registry } from "@/background/messenger/api";
import { setCachedAuthData } from "@/background/auth/authStorage";

const integrationDefinitionMap = new Map([
  [CONTROL_ROOM_TOKEN_INTEGRATION_ID, tokenIntegrationDefinition],
  [CONTROL_ROOM_OAUTH_INTEGRATION_ID, oauthIntegrationDefinition],
]);

jest.mock("@/auth/token", () => ({
  readPartnerAuthData: jest.fn().mockResolvedValue({}),
  setPartnerAuth: jest.fn().mockResolvedValue(undefined),
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

jest.mock("@/background/auth/authStorage", () => ({
  setCachedAuthData: jest.fn().mockResolvedValue(undefined),
}));

// Module mocked via __mocks__/@/background/messenger/api
jest.mocked(registry.find).mockImplementation(async (id: RegistryId) => {
  const config = integrationDefinitionMap.get(id);
  return {
    id: (config.metadata as any).id,
    config,
  } as any;
});

const readRawConfigurationsMock = jest.mocked(readRawConfigurations);
const setPartnerAuthMock = jest.mocked(setPartnerAuth);
const readPartnerAuthDataMock = jest.mocked(readPartnerAuthData);
const setCachedAuthDataMock = jest.mocked(setCachedAuthData);

describe("getPartnerPrincipals", () => {
  beforeEach(() => {
    appApiMock.reset();

    appApiMock
      .onGet("/api/registry/bricks/")
      .reply(200, [tokenIntegrationDefinition, oauthIntegrationDefinition]);

    appApiMock.onGet("/api/services/shared/").reply(200, []);

    readRawConfigurationsMock.mockReset();
  });

  test("get empty principals", async () => {
    // No local integration configurations
    readRawConfigurationsMock.mockResolvedValue([]);

    await syncRemotePackages();
    await serviceLocator.refresh();

    const principals = await getPartnerPrincipals();

    expect(principals).toStrictEqual([]);
  });

  test("get configured principal", async () => {
    // Local configuration
    readRawConfigurationsMock.mockResolvedValue([
      integrationConfigFactory({
        integrationId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
        config: secretsConfigFactory({
          controlRoomUrl: "https://control-room.example.com",
          username: "bot_creator",
        }),
      }),
    ]);

    await serviceLocator.refresh();
    await syncRemotePackages();

    const principals = await getPartnerPrincipals();

    expect(principals).toStrictEqual([
      {
        hostname: "control-room.example.com",
        principalId: "bot_creator",
      },
    ]);
  });
});

describe("refresh partner token", () => {
  beforeEach(() => {
    appApiMock.reset();
    appApiMock.resetHistory();
  });

  it("nop if no token", async () => {
    await _refreshPartnerToken();
    expect(readPartnerAuthDataMock).toHaveBeenCalledOnce();
  });

  it("nop if no refresh token", async () => {
    readPartnerAuthDataMock.mockResolvedValue({
      authId: uuidv4(),
      token: "notatoken",
    });

    await _refreshPartnerToken();
    expect(appApiMock.history.post).toHaveLength(0);
  });

  it("refreshes token", async () => {
    const authId = uuidv4();
    readPartnerAuthDataMock.mockResolvedValue({
      authId,
      token: "notatoken",
      refreshToken: "notarefreshtoken",
    });

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: authId,
        integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        config: secretsConfigFactory({
          controlRoomUrl: "https://controlroom.com",
        }),
      } as IntegrationConfig,
    ]);

    appApiMock.onGet("/api/services/shared/").reply(200, []);
    appApiMock.onPost().reply(200, {
      access_token: "notatoken2",
      refresh_token: "notarefreshtoken2",
    });

    await serviceLocator.refreshLocal();

    await _refreshPartnerToken();
    expect(appApiMock.history.post).toHaveLength(1);
    // `toHaveBeenCalledOnceWith` had the wrong types :shrug:
    expect(setPartnerAuthMock).toHaveBeenCalledWith({
      authId,
      token: "notatoken2",
      refreshToken: "notarefreshtoken2",
      extraHeaders: {
        "X-Control-Room": "https://controlroom.com",
      },
    });

    expect(setCachedAuthDataMock).toHaveBeenCalledWith(authId, {
      access_token: "notatoken2",
      refresh_token: "notarefreshtoken2",
    });
  });

  it("throws on authorization error", async () => {
    const authId = uuidv4();
    readPartnerAuthDataMock.mockResolvedValue({
      authId,
      token: "notatoken",
      refreshToken: "notarefreshtoken",
    });

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: authId,
        integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        config: secretsConfigFactory({
          controlRoomUrl: "https://controlroom.com",
        }),
      } as IntegrationConfig,
    ]);

    appApiMock.onGet("/api/services/shared/").reply(200, []);
    appApiMock.onPost().reply(401);

    await serviceLocator.refreshLocal();

    await expect(_refreshPartnerToken()).rejects.toThrow(
      "Request failed with status code 401"
    );
  });
});
