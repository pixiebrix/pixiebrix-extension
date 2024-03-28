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

import {
  debouncedActivateStarterMods,
  getBuiltInIntegrationConfigs,
} from "@/background/starterMods";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/extensionsStorage";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { isLinked } from "@/auth/authStorage";
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
import { meOrganizationApiResponseFactory } from "@/testUtils/factories/authFactories";
import { remoteIntegrationConfigurationFactory } from "@/testUtils/factories/integrationFactories";

const axiosMock = new MockAdapter(axios);

jest.mock("@/auth/authStorage", () => ({
  async getAuthHeaders() {
    return {};
  },
  isLinked: jest.fn().mockResolvedValue(true),
  addListener: jest.fn(),
}));

jest.mock("@/utils/extensionUtils");
jest.mock("./refreshRegistries");

const isLinkedMock = jest.mocked(isLinked);
const refreshRegistriesMock = jest.mocked(refreshRegistries);

jest.useFakeTimers();

beforeEach(async () => {
  jest.resetModules();
  jest.runAllTimers();

  // Reset local options state
  await saveModComponentState({
    extensions: [],
  });

  jest.clearAllMocks();

  axiosMock.onGet("/api/services/shared/?meta=1").reply(200, []);
});

describe("debouncedActivateStarterMods", () => {
  test("user has starter mods available to activate", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]._recipe.id).toEqual(
      modDefinition.metadata.id,
    );
    expect(refreshRegistriesMock).toHaveBeenCalledOnce();
  });

  test("getBuiltInIntegrationConfigs", async () => {
    axiosMock.onGet("/api/services/shared/?meta=1").reply(200, [
      remoteIntegrationConfigurationFactory(),
      remoteIntegrationConfigurationFactory({
        organization: meOrganizationApiResponseFactory(),
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

  test("starter mods request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(500);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(0);
  });

  test("activate starter mod with built-in auths", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();

    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, builtInIntegrationConfigs);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toBeArrayOfSize(1);
    const activatedModComponent = activatedModComponents[0];

    expect(activatedModComponent.extensionPointId).toBe(
      modDefinition.extensionPoints[0].id,
    );
    expect(activatedModComponent.integrationDependencies).toBeArrayOfSize(2);

    const dependency1 = activatedModComponent.integrationDependencies.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service1",
    );
    const dependency2 = activatedModComponent.integrationDependencies.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service2",
    );

    expect(dependency1.configId).toBe(builtInIntegrationConfigs[0].id);
    expect(dependency2.configId).toBe(builtInIntegrationConfigs[1].id);
  });

  test("starter mod already activated", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();

    const activatedModComponent = modComponentFactory({
      _recipe: { id: modDefinition.metadata.id } as ModComponentBase["_recipe"],
    }) as ActivatedModComponent;
    await saveModComponentState({
      extensions: [activatedModComponent],
    });

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(200, [
      {
        extensionPoints: [activatedModComponent],
        ...modDefinition,
      },
    ]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]._recipe.id).toEqual(
      modDefinition.metadata.id,
    );
  });

  test("activated mod component with no _recipe doesn't throw undefined error", async () => {
    isLinkedMock.mockResolvedValue(true);

    const activatedModComponent = modComponentFactory({
      _recipe: undefined,
    }) as ActivatedModComponent;
    await saveModComponentState({
      extensions: [activatedModComponent],
    });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [defaultModDefinitionFactory()]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(2);
  });

  test("activate starter mod with optional integrations", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();
    modDefinition.extensionPoints[0].services = {
      properties: {
        google: {
          $ref: "https://app.pixiebrix.com/schemas/services/google/oauth2-pkce",
        },
      },
      required: [],
    };

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(1);
    const activatedModComponent = activatedModComponents[0];
    expect(activatedModComponent._recipe.id).toEqual(modDefinition.metadata.id);
    expect(activatedModComponent.integrationDependencies).toBeArrayOfSize(1);
    // Expect the optional dependency NOT to be configured
    expect(
      activatedModComponent.integrationDependencies[0].configId,
    ).toBeUndefined();
  });

  test("activate starter mods with optional integrations, 1 with built-in auth", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();
    modDefinition.extensionPoints[0].services = {
      properties: {
        service1: {
          $ref: "https://app.pixiebrix.com/schemas/services/@pixiebrix/service1",
        },
        service2: {
          $ref: "https://app.pixiebrix.com/schemas/services/@pixiebrix/service2",
        },
      },
      required: ["service2"],
    };

    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, builtInIntegrationConfigs);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toBeArrayOfSize(1);

    const activatedModComponent1 = activatedModComponents[0];
    expect(activatedModComponent1.extensionPointId).toBe(
      modDefinition.extensionPoints[0].id,
    );
    expect(activatedModComponent1.integrationDependencies).toBeArrayOfSize(2);

    const dependency1 = activatedModComponent1.integrationDependencies.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service1",
    );
    const dependency2 = activatedModComponent1.integrationDependencies.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service2",
    );

    // Expect the optional dependency NOT to be configured
    expect(dependency1.configId).toBe(builtInIntegrationConfigs[0].id);
    // Expect the required dependency to be configured
    expect(dependency2.configId).toBe(builtInIntegrationConfigs[1].id);
  });
});
