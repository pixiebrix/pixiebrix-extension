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

import { getCachedAuthData } from "@/background/auth/authStorage";
import launchOAuth2Flow from "@/background/auth/launchOAuth2Flow";
import { authDataFactory } from "@/testUtils/factories/authFactories";
import { getOAuth2AuthData } from "@/background/requests";
import { type Integration } from "@/integrations/integrationTypes";
import {
  integrationConfigFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

jest.mock("@/background/auth/authStorage.ts");
jest.mock("@/background/auth/launchOAuth2Flow");

const getCachedAuthDataMock = jest.mocked(getCachedAuthData);
const launchOAuth2FlowMock = jest.mocked(launchOAuth2Flow);

describe("getOAuth2AuthData", () => {
  beforeEach(() => {
    getCachedAuthDataMock.mockReset();
    launchOAuth2FlowMock.mockReset();
  });

  it("returns cached auth data if found", async () => {
    const data = authDataFactory();
    const sanitizedConfig = sanitizedIntegrationConfigFactory();
    getCachedAuthDataMock.mockResolvedValue(data);
    await expect(
      getOAuth2AuthData(
        {} as unknown as Integration,
        integrationConfigFactory(),
        sanitizedConfig,
        { interactive: true },
      ),
    ).resolves.toEqual(data);
    expect(getCachedAuthDataMock).toHaveBeenCalledWith(sanitizedConfig.id);
    expect(launchOAuth2FlowMock).not.toHaveBeenCalled();
  });

  it("requests a new login if cached auth data is not found", async () => {
    const data = authDataFactory();
    const integrationId = registryIdFactory();
    const localConfig = integrationConfigFactory({
      integrationId,
    });
    const sanitizedIntegrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: integrationId,
    });
    const integration = {
      id: integrationId,
    } as unknown as Integration;
    launchOAuth2FlowMock.mockResolvedValue(data);
    await expect(
      getOAuth2AuthData(integration, localConfig, sanitizedIntegrationConfig, {
        interactive: true,
      }),
    ).resolves.toEqual(data);
    expect(getCachedAuthDataMock).toHaveBeenCalledWith(
      sanitizedIntegrationConfig.id,
    );
    expect(launchOAuth2FlowMock).toHaveBeenCalledWith(
      integration,
      localConfig,
      { interactive: true },
    );
  });

  it("only requests 1 login if multiple requests are made asynchronously with no cached auth data", async () => {
    const data = authDataFactory();
    const integrationId = registryIdFactory();
    const localConfig = integrationConfigFactory({
      integrationId,
    });
    const sanitizedIntegrationConfig = sanitizedIntegrationConfigFactory({
      serviceId: integrationId,
    });
    const integration = {
      id: integrationId,
    } as unknown as Integration;
    launchOAuth2FlowMock.mockResolvedValue(data);

    const promiseFactory = async () =>
      getOAuth2AuthData(integration, localConfig, sanitizedIntegrationConfig, {
        interactive: true,
      });

    await Promise.all([
      expect(promiseFactory()).resolves.toEqual(data),
      expect(promiseFactory()).resolves.toEqual(data),
      expect(promiseFactory()).resolves.toEqual(data),
      expect(promiseFactory()).resolves.toEqual(data),
      expect(promiseFactory()).resolves.toEqual(data),
    ]);
    expect(getCachedAuthDataMock).toHaveBeenCalledTimes(1);
    expect(launchOAuth2FlowMock).toHaveBeenCalledTimes(1);
  });
});
