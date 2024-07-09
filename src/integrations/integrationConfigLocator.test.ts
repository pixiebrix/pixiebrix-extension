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
import { remoteIntegrationConfigurationFactory } from "@/testUtils/factories/integrationFactories";
import IntegrationConfigLocator from "@/integrations/integrationConfigLocator";
import controlRoomTokenService from "@contrib/integrations/automation-anywhere.yaml";
import { fromJS } from "@/integrations/UserDefinedIntegration";
import serviceRegistry from "@/integrations/registry";

const integration = fromJS(controlRoomTokenService as any);
const locator = new IntegrationConfigLocator();

jest.mock("@/background/messenger/api", () => {
  const actual = jest.requireActual("@/background/messenger/api");
  return {
    ...actual,
    registry: {
      find: jest.fn().mockRejectedValue(new Error("Implement mock in test")),
    },
  };
});

beforeEach(() => {
  appApiMock.reset();
  serviceRegistry.clear();
});

describe("locator", () => {
  it("sets proxy: true for remote configurations", async () => {
    serviceRegistry.register([integration]);

    const config = remoteIntegrationConfigurationFactory({
      service: {
        name: integration.id,
        config: {
          metadata: {
            id: integration.id,
            name: integration.name,
          },
        },
      },
      pushdown: false,
    });

    appApiMock.onGet("/api/services/shared/").reply(200, [config]);

    await locator.refreshRemote();

    const option = await locator.findSanitizedIntegrationConfig(
      config.service.name,
      config.id,
    );
    expect(option.proxy).toBe(true);

    await expect(
      locator.findIntegrationConfig(config.id),
    ).resolves.toBeUndefined();
  });

  it("sets proxy: false for remote pushdown configurations", async () => {
    serviceRegistry.register([integration]);

    const config = remoteIntegrationConfigurationFactory({
      service: {
        name: integration.id,
        config: {
          metadata: {
            id: integration.id,
            name: integration.name,
          },
        },
      },
      pushdown: true,
    });

    appApiMock.onGet("/api/services/shared/").reply(200, [config]);

    await locator.refreshRemote();

    const option = await locator.findSanitizedIntegrationConfig(
      config.service.config.metadata.id,
      config.id,
    );

    expect(option.proxy).toBe(false);

    await expect(
      locator.findIntegrationConfig(config.id),
    ).resolves.not.toBeNull();
  });
});
