/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { getPartnerPrincipals } from "@/background/partnerIntegrations";
import serviceRegistry, { readRawConfigurations } from "@/services/registry";

import { fetch } from "@/hooks/fetch";

import controlRoomTokenService from "@contrib/services/automation-anywhere.yaml";
import controlRoomOAuthService from "@contrib/services/automation-anywhere-oauth2.yaml";
import { type RawServiceConfiguration, type RegistryId } from "@/core";
import { locator as serviceLocator } from "@/background/locator";
import { CONTROL_ROOM_SERVICE_ID } from "@/services/constants";
import { uuidv4 } from "@/types/helpers";

const serviceMap = new Map([
  [(controlRoomTokenService as any).metadata.id, controlRoomTokenService],
  [(controlRoomOAuthService as any).metadata.id, controlRoomOAuthService],
]);

jest.mock("@/hooks/fetch", () => ({
  fetch: jest.fn(),
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

jest.mock("@/background/messenger/api", () => {
  const actual = jest.requireActual("@/background/messenger/api");
  return {
    ...actual,
    registry: {
      async find(id: RegistryId) {
        const config = serviceMap.get(id);
        return {
          id: (config.metadata as any).id,
          config,
        };
      },
      syncRemote: jest.fn(),
    },
  };
});

const readRawConfigurationsMock = readRawConfigurations as jest.Mock;
const fetchMock = fetch as jest.Mock;

describe("getPartnerPrincipals", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    readRawConfigurationsMock.mockReset();
  });

  test("get empty principals", async () => {
    fetchMock.mockResolvedValue([
      controlRoomTokenService,
      controlRoomOAuthService,
    ]);

    await serviceRegistry.fetch();

    // No remote services configured
    fetchMock.mockResolvedValue([]);
    readRawConfigurationsMock.mockResolvedValue([]);

    const principles = await getPartnerPrincipals();

    expect(principles).toStrictEqual([]);
  });

  test("get configured principal", async () => {
    fetchMock.mockResolvedValue([
      controlRoomTokenService,
      controlRoomOAuthService,
    ]);

    await serviceRegistry.fetch();

    // No remote services configured
    fetchMock.mockResolvedValue([]);

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: uuidv4(),
        serviceId: CONTROL_ROOM_SERVICE_ID,
        config: {
          controlRoomUrl: "https://control-room.example.com",
          username: "bot_creator",
        },
      } as unknown as RawServiceConfiguration,
    ]);

    await serviceLocator.refreshLocal();

    const principles = await getPartnerPrincipals();

    expect(principles).toStrictEqual([
      {
        hostname: "control-room.example.com",
        principalId: "bot_creator",
      },
    ]);
  });
});
