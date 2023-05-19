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
import { fetch } from "@/hooks/fetch";
import controlRoomTokenService from "@contrib/services/automation-anywhere.yaml";
import controlRoomOAuthService from "@contrib/services/automation-anywhere-oauth2.yaml";
import { locator as serviceLocator } from "@/background/locator";
import {
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  CONTROL_ROOM_TOKEN_SERVICE_ID,
} from "@/services/constants";
import { uuidv4 } from "@/types/helpers";
import { readPartnerAuthData, setPartnerAuth } from "@/auth/token";
import { setCachedAuthData } from "@/background/auth";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { syncRemotePackages } from "@/baseRegistry";
import { type RegistryId } from "@/types/registryTypes";
import { type RawServiceConfiguration } from "@/types/serviceTypes";

const serviceMap = new Map([
  [(controlRoomTokenService as any).metadata.id, controlRoomTokenService],
  [(controlRoomOAuthService as any).metadata.id, controlRoomOAuthService],
]);

jest.mock("@/hooks/fetch", () => ({
  fetch: jest.fn(),
}));

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
      syncRemote: jest.fn().mockResolvedValue(undefined),
    },
  };
});

jest.mock("@/hooks/fetch", () => ({
  fetch: jest.fn(),
}));

jest.mock("@/background/auth", () => ({
  setCachedAuthData: jest.fn().mockResolvedValue(undefined),
}));

const axiosMock = new MockAdapter(axios);

afterEach(() => {
  axiosMock.reset();
  axiosMock.resetHistory();
});

const readRawConfigurationsMock = readRawConfigurations as jest.Mock;
const fetchMock = fetch as jest.Mock;
const setPartnerAuthMock = setPartnerAuth as jest.Mock;
const readPartnerAuthDataMock = readPartnerAuthData as jest.Mock;
const setCachedAuthDataMock = setCachedAuthData as jest.Mock;

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

    await syncRemotePackages();

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

    await syncRemotePackages();

    // No remote services configured
    fetchMock.mockResolvedValue([]);

    readRawConfigurationsMock.mockResolvedValue([
      {
        id: uuidv4(),
        serviceId: CONTROL_ROOM_TOKEN_SERVICE_ID,
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

describe("refresh partner token", () => {
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
    expect(axiosMock.history.post).toHaveLength(0);
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
        serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
        config: {
          controlRoomUrl: "https://controlroom.com",
        },
      } as unknown as RawServiceConfiguration,
    ]);

    axiosMock.onPost().reply(200, {
      access_token: "notatoken2",
      refresh_token: "notarefreshtoken2",
    });

    await serviceLocator.refreshLocal();

    await _refreshPartnerToken();
    expect(axiosMock.history.post).toHaveLength(1);
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
        serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
        config: {
          controlRoomUrl: "https://controlroom.com",
        },
      } as unknown as RawServiceConfiguration,
    ]);

    axiosMock.onPost().reply(401);

    await serviceLocator.refreshLocal();

    await expect(_refreshPartnerToken()).rejects.toThrow(
      "Request failed with status code 401"
    );
  });
});
