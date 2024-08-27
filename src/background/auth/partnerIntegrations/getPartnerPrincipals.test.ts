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

import { appApiMock } from "@/testUtils/appApiMock";
import tokenIntegrationDefinition from "@contrib/integrations/automation-anywhere.yaml";
import oauthIntegrationDefinition from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import { syncRemotePackages } from "@/registry/memoryRegistry";
import { integrationConfigLocator as serviceLocator } from "@/background/integrationConfigLocator";
import { getPartnerPrincipals } from "@/background/auth/partnerIntegrations/getPartnerPrincipals";
import {
  integrationConfigFactory,
  secretsConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "@/integrations/constants";
import { registry } from "@/background/messenger/api";
import { type RegistryId } from "@/types/registryTypes";
import { readRawConfigurations } from "@/integrations/util/readRawConfigurations";
import { API_PATHS } from "@/data/service/urlPaths";

jest.mock("@/integrations/registry", () => {
  const actual = jest.requireActual("@/integrations/registry");
  return {
    // Include __esModule so default export works
    __esModule: true,
    ...actual,
    readRawConfigurations: jest.fn().mockResolvedValue([]),
  };
});

const integrationDefinitionMap = new Map([
  [CONTROL_ROOM_TOKEN_INTEGRATION_ID, tokenIntegrationDefinition],
  [CONTROL_ROOM_OAUTH_INTEGRATION_ID, oauthIntegrationDefinition],
]);

// Module mocked via __mocks__/@/background/messenger/api
jest.mocked(registry.find).mockImplementation(async (id: RegistryId) => {
  const config = integrationDefinitionMap.get(id);
  return {
    id: (config!.metadata as any).id,
    config,
  } as any;
});

jest.mock("@/integrations/util/readRawConfigurations");
const readRawConfigurationsMock = jest.mocked(readRawConfigurations);

describe("getPartnerPrincipals", () => {
  beforeEach(() => {
    appApiMock.reset();

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .reply(200, [tokenIntegrationDefinition, oauthIntegrationDefinition]);

    appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(200, []);

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
