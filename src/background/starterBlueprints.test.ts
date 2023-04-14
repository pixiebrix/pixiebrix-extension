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
  debouncedInstallStarterBlueprints,
  getAllRequiredServiceIds,
  getBuiltInAuthsByRequiredServiceIds,
  getBuiltInServiceAuths,
} from "@/background/starterBlueprints";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { isLinked } from "@/auth/token";
import {
  extensionFactory,
  extensionPointConfigFactory,
  organizationFactory,
  recipeFactory,
  sanitizedAuthFactory,
  sanitizedAuthServiceFactory,
} from "@/testUtils/factories";
import { refreshRegistries } from "./refreshRegistries";
import {
  type IExtension,
  type PersistedExtension,
} from "@/types/extensionTypes";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type RegistryId } from "@/types/registryTypes";
import { type OutputKey } from "@/types/runtimeTypes";

const axiosMock = new MockAdapter(axios);

jest.mock("@/auth/token", () => ({
  async getAuthHeaders() {
    return {};
  },
  isLinked: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/background/activeTab", () => ({
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
  await saveOptions({
    extensions: [],
  });

  jest.clearAllMocks();
});

const getRecipeWithBuiltInServiceAuths = () => {
  const extensionServices = {
    service1: "@pixiebrix/service1",
    service2: "@pixiebrix/service2",
  } as Record<OutputKey, RegistryId>;

  const extensionPointDefinition = extensionPointConfigFactory({
    services: extensionServices,
  });

  const recipe = recipeFactory({
    extensionPoints: [extensionPointDefinition],
  });

  const builtInServiceAuths = [
    sanitizedAuthFactory({
      service: sanitizedAuthServiceFactory({
        config: {
          metadata: {
            id: validateRegistryId("@pixiebrix/service1"),
            name: "Service 1",
          },
        },
      }),
    }),
    sanitizedAuthFactory({
      service: sanitizedAuthServiceFactory({
        config: {
          metadata: {
            id: validateRegistryId("@pixiebrix/service2"),
            name: "Service 2",
          },
        },
      }),
    }),
  ];

  return { recipe, builtInServiceAuths };
};

describe("installStarterBlueprints", () => {
  test("user has starter blueprints available to install", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [recipeFactory()]);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
    expect((refreshRegistries as jest.Mock).mock.calls).toHaveLength(1);
  });

  test("getBuiltInServiceAuths", async () => {
    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, [
        sanitizedAuthFactory(),
        sanitizedAuthFactory({ organization: organizationFactory() }),
        sanitizedAuthFactory({ user: uuidv4() }),
      ]);

    let builtInServiceAuths = await getBuiltInServiceAuths();
    expect(builtInServiceAuths.length).toBe(1);

    axiosMock.onGet("/api/services/shared/?meta=1").reply(200, []);

    builtInServiceAuths = await getBuiltInServiceAuths();
    expect(builtInServiceAuths.length).toBe(0);

    axiosMock.onGet("/api/services/shared/?meta=1").reply(500);

    builtInServiceAuths = await getBuiltInServiceAuths();
    expect(builtInServiceAuths.length).toBe(0);
  });

  test("getAllRequiredServiceIds", () => {
    const extensionServices = {
      service1: "@pixiebrix/service1",
      service2: "@pixiebrix/service2",
    } as Record<OutputKey, RegistryId>;

    const extensionPointDefinition = extensionPointConfigFactory({
      services: extensionServices,
    });

    const recipe = recipeFactory({
      extensionPoints: [extensionPointDefinition],
    });

    // It works on an array of one recipe
    let serviceIds = getAllRequiredServiceIds([recipe]);
    expect(serviceIds).toEqual(Object.values(extensionServices));

    // It produces a unique list of service IDs
    serviceIds = getAllRequiredServiceIds([recipe, recipe]);
    expect(serviceIds).toEqual(Object.values(extensionServices));

    // It works on an empty array
    serviceIds = getAllRequiredServiceIds([]);
    expect(serviceIds).toEqual([]);

    // It works on an array of recipes with no services
    serviceIds = getAllRequiredServiceIds([recipeFactory()]);
    expect(serviceIds).toEqual([]);
  });

  test("getBuiltInAuthsByRequiredServiceIds", async () => {
    const { recipe, builtInServiceAuths } = getRecipeWithBuiltInServiceAuths();

    const serviceIds = getAllRequiredServiceIds([recipe]);

    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, builtInServiceAuths);

    const builtInAuthsByRequiredServiceIds =
      await getBuiltInAuthsByRequiredServiceIds(serviceIds);

    expect(builtInAuthsByRequiredServiceIds).toEqual({
      "@pixiebrix/service1": builtInServiceAuths[0].id,
      "@pixiebrix/service2": builtInServiceAuths[1].id,
    });
  });

  test("starter blueprints request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/install/")
      .reply(200, { install_starter_blueprints: true });
    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(500);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(0);
  });

  test("starter blueprints installation request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [recipeFactory()]);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(500);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
  });

  test("install starter blueprint with built-in auths", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { recipe, builtInServiceAuths } = getRecipeWithBuiltInServiceAuths();

    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, builtInServiceAuths);

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(200, [recipe]);

    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
    const installedExtension = extensions[0];

    expect(installedExtension.extensionPointId).toBe(
      recipe.extensionPoints[0].id
    );
    expect(installedExtension.services.length).toBe(2);

    const service1 = installedExtension.services.find(
      (service) => service.id === "@pixiebrix/service1"
    );
    const service2 = installedExtension.services.find(
      (service) => service.id === "@pixiebrix/service2"
    );

    expect(service1.config).toBe(builtInServiceAuths[0].id);
    expect(service2.config).toBe(builtInServiceAuths[1].id);
  });

  test("starter blueprint already installed", async () => {
    isLinkedMock.mockResolvedValue(true);

    const recipe = recipeFactory();

    const extension = extensionFactory({
      _recipe: { id: recipe.metadata.id } as IExtension["_recipe"],
    }) as PersistedExtension;
    await saveOptions({
      extensions: [extension],
    });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/install/")
      .reply(200, { install_starter_blueprints: true });

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(200, [
      {
        extensionPoints: [extension],
        ...recipe,
      },
    ]);

    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
  });

  test("extension with no _recipe doesn't throw undefined error", async () => {
    isLinkedMock.mockResolvedValue(true);

    const extension = extensionFactory({
      _recipe: undefined,
    }) as PersistedExtension;
    await saveOptions({
      extensions: [extension],
    });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/install/")
      .reply(200, { install_starter_blueprints: true });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [recipeFactory()]);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(2);
  });
});
