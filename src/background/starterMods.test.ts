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
  debouncedInstallStarterMods,
  getBuiltInIntegrationConfigs,
} from "@/background/starterMods";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/extensionsStorage";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { isLinked } from "@/auth/token";
import { refreshRegistries } from "./refreshRegistries";
import {
  type ActivatedModComponent,
  type ModComponentBase,
} from "@/types/modComponentTypes";
import { uuidv4 } from "@/types/helpers";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import {
  defaultModDefinitionFactory,
  getModDefinitionWithBuiltInIntegrationConfigs,
} from "@/testUtils/factories/modDefinitionFactories";
import { userOrganizationFactory } from "@/testUtils/factories/authFactories";
import { remoteIntegrationConfigurationFactory } from "@/testUtils/factories/integrationFactories";

const axiosMock = new MockAdapter(axios);

jest.mock("@/auth/token", () => ({
  async getAuthHeaders() {
    return {};
  },
  isLinked: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/utils/extensionUtils", () => ({
  forEachTab: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./refreshRegistries", () => ({
  refreshRegistries: jest.fn().mockResolvedValue(undefined),
}));

const isLinkedMock = isLinked as jest.Mock;
jest.useFakeTimers();

beforeEach(async () => {
  jest.resetModules();
  jest.runAllTimers();

  // Reset local options state
  await saveModComponentState({
    extensions: [],
  });

  jest.clearAllMocks();
});

describe("installStarterBlueprints", () => {
  test("user has starter blueprints available to install", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [defaultModDefinitionFactory()]);

    await debouncedInstallStarterMods();
    const { extensions } = await getModComponentState();

    expect(extensions).toHaveLength(1);
    expect((refreshRegistries as jest.Mock).mock.calls).toHaveLength(1);
  });

  test("getBuiltInIntegrationConfigs", async () => {
    axiosMock.onGet("/api/services/shared/?meta=1").reply(200, [
      remoteIntegrationConfigurationFactory(),
      remoteIntegrationConfigurationFactory({
        organization: userOrganizationFactory(),
      }),
      remoteIntegrationConfigurationFactory({ user: uuidv4() }),
    ]);

    let builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();
    expect(builtInIntegrationConfigs).toBeArrayOfSize(1);

    axiosMock.onGet("/api/services/shared/?meta=1").reply(200, []);

    builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();
    expect(builtInIntegrationConfigs).toBeArrayOfSize(0);

    axiosMock.onGet("/api/services/shared/?meta=1").reply(500);

    builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();
    expect(builtInIntegrationConfigs).toBeArrayOfSize(0);
  });

  test("starter blueprints request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(500);

    await debouncedInstallStarterMods();
    const { extensions } = await getModComponentState();

    expect(extensions).toHaveLength(0);
  });

  test("starter blueprints installation request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [defaultModDefinitionFactory()]);

    await debouncedInstallStarterMods();
    const { extensions } = await getModComponentState();

    expect(extensions).toHaveLength(1);
  });

  test("install starter blueprint with built-in auths", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();

    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, builtInIntegrationConfigs);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedInstallStarterMods();
    const { extensions: modComponents } = await getModComponentState();

    expect(modComponents).toBeArrayOfSize(1);
    const installedComponent = modComponents[0];

    expect(installedComponent.extensionPointId).toBe(
      modDefinition.extensionPoints[0].id
    );
    expect(installedComponent.integrationDependencies).toBeArrayOfSize(2);

    const dependency1 = installedComponent.integrationDependencies.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service1"
    );
    const dependency2 = installedComponent.integrationDependencies.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service2"
    );

    expect(dependency1.configId).toBe(builtInIntegrationConfigs[0].id);
    expect(dependency2.configId).toBe(builtInIntegrationConfigs[1].id);
  });

  test("starter blueprint already installed", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();

    const modComponent = modComponentFactory({
      _recipe: { id: modDefinition.metadata.id } as ModComponentBase["_recipe"],
    }) as ActivatedModComponent;
    await saveModComponentState({
      extensions: [modComponent],
    });

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(200, [
      {
        extensionPoints: [modComponent],
        ...modDefinition,
      },
    ]);

    await debouncedInstallStarterMods();
    const { extensions } = await getModComponentState();

    expect(extensions).toHaveLength(1);
  });

  test("extension with no _recipe doesn't throw undefined error", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modComponent = modComponentFactory({
      _recipe: undefined,
    }) as ActivatedModComponent;
    await saveModComponentState({
      extensions: [modComponent],
    });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [defaultModDefinitionFactory()]);

    await debouncedInstallStarterMods();
    const { extensions } = await getModComponentState();

    expect(extensions).toHaveLength(2);
  });
});
