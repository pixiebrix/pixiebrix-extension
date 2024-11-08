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

import { appApiMock } from "../testUtils/appApiMock";
import { remoteIntegrationConfigurationFactory } from "../testUtils/factories/integrationFactories";
import IntegrationConfigLocator from "./integrationConfigLocator";
import controlRoomTokenService from "../../contrib/integrations/automation-anywhere.yaml";
import { fromJS } from "./UserDefinedIntegration";
import integrationRegistry from "./registry";
import { API_PATHS } from "../data/service/urlPaths";

const integration = fromJS(controlRoomTokenService as any);
const locator = new IntegrationConfigLocator();

jest.mock("../background/messenger/api", () => {
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
  integrationRegistry.clear();
});

describe("locator", () => {
  it("sets proxy: true for remote configurations", async () => {
    integrationRegistry.register([integration]);

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

    appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(200, [config]);

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
    integrationRegistry.register([integration]);

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

    appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(200, [config]);

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
