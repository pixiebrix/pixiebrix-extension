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

import { debouncedActivateStarterMods } from "@/background/starterMods";
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
import {
  getSidebarState,
  saveSidebarState,
} from "@/store/sidebar/sidebarStorage";
import { MOD_LAUNCHER } from "@/store/sidebar/constants";
import {
  eventKeyForEntry,
  getEventKeyForPanel,
} from "@/store/sidebar/eventKeyUtils";
import produce from "immer";
import { type StarterBrickDefinitionProp } from "@/starterBricks/types";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type StarterBrickKind } from "@/types/starterBrickTypes";
import {
  PIXIEBRIX_INTEGRATION_ID,
  PIXIEBRIX_INTEGRATION_CONFIG_ID,
} from "@/integrations/constants";
import { databaseFactory } from "@/testUtils/factories/databaseFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { getBuiltInIntegrationConfigs } from "@/background/getBuiltInIntegrationConfigs";

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
  await saveSidebarState({ closedTabs: {} });

  jest.clearAllMocks();

  axiosMock.onGet("/api/services/shared/?meta=1").reply(200, []);
});

describe("debouncedActivateStarterMods", () => {
  function overrideStarterBrickType(
    modDefinition: ModDefinition,
    type: StarterBrickKind,
  ) {
    return produce(modDefinition, (draft) => {
      (
        draft.definitions.extensionPoint
          .definition as StarterBrickDefinitionProp
      ).type = type;
    });
  }

  test("user has starter mods available to activate, with sidebar starter bricks", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = overrideStarterBrickType(
      defaultModDefinitionFactory(),
      "actionPanel",
    );

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]._recipe.id).toEqual(
      modDefinition.metadata.id,
    );

    expect(closedTabs).toStrictEqual({
      [getEventKeyForPanel(activatedModComponents[0].id)]: true,
      [eventKeyForEntry(MOD_LAUNCHER)]: false,
    });

    expect(refreshRegistriesMock).toHaveBeenCalledOnce();
  });

  test("user has starter mods available to activate, no sidebar starter bricks", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]._recipe.id).toEqual(
      modDefinition.metadata.id,
    );

    expect(closedTabs).toStrictEqual({});

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

    const { modDefinition: _modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();

    const modDefinition = overrideStarterBrickType(
      _modDefinition,
      "actionPanel",
    );

    axiosMock
      .onGet("/api/services/shared/?meta=1")
      .reply(200, builtInIntegrationConfigs);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [modDefinition]);

    await debouncedActivateStarterMods();
    const { extensions: activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toBeArrayOfSize(1);
    const activatedModComponent = activatedModComponents[0];

    expect(closedTabs).toStrictEqual({
      [getEventKeyForPanel(activatedModComponent.id)]: true,
      [eventKeyForEntry(MOD_LAUNCHER)]: false,
    });

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
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]._recipe.id).toEqual(
      modDefinition.metadata.id,
    );

    expect(closedTabs).toStrictEqual({});
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

  test("activate starter mod with required pixiebrix integration", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition } = getModDefinitionWithBuiltInIntegrationConfigs();
    modDefinition.extensionPoints[0].services = {
      type: "object",
      properties: {
        service: {
          $ref: `https://app.pixiebrix.com/schemas/services/${PIXIEBRIX_INTEGRATION_ID}`,
        },
      },
      required: ["service"],
    };

    axiosMock.onGet("/api/services/shared/?meta=1").reply(200, []);

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
    expect(activatedModComponent.integrationDependencies).toBeArrayOfSize(1);

    const dependency = activatedModComponent.integrationDependencies.find(
      ({ integrationId }) => integrationId === PIXIEBRIX_INTEGRATION_ID,
    );

    // As of 1.8.13, a sentinel value is used for the configId of the integration to simplify strict null checks
    expect(dependency.configId).toBe(PIXIEBRIX_INTEGRATION_CONFIG_ID);
  });

  describe("databases", () => {
    beforeEach(() => {
      isLinkedMock.mockResolvedValue(true);
      axiosMock.resetHistory();
      axiosMock.onGet("/api/services/shared/?meta=1").reply(200, []);
    });

    function modFactory() {
      const { modDefinition } = getModDefinitionWithBuiltInIntegrationConfigs();

      (modDefinition.metadata as any).name = "Test Mod";

      modDefinition.options = {
        schema: {
          properties: {
            database: {
              $ref: "https://app.pixiebrix.com/schemas/database#",
              title: "Test Database",
              format: "preview",
            },
          },
          required: ["database"],
        },
      };

      modDefinition.extensionPoints[0].services = {
        type: "object",
        properties: {
          service: {
            $ref: `https://app.pixiebrix.com/schemas/services/${PIXIEBRIX_INTEGRATION_ID}`,
          },
        },
        required: ["service"],
      };

      return modDefinition;
    }

    test("activate starter mod with required pixiebrix database", async () => {
      const modDefinition = modFactory();
      const databaseId = autoUUIDSequence();

      axiosMock
        .onGet("/api/onboarding/starter-blueprints/")
        .reply(200, [modDefinition])
        .onGet("/api/databases/")
        .reply(200, [])
        .onPost("/api/databases/")
        .reply((args) => {
          const data = JSON.parse(args.data) as UnknownObject;
          expect(data).toStrictEqual({ name: "Test Mod - Test Database" });

          return [
            201,
            databaseFactory({ id: databaseId, name: data.name as string }),
          ];
        });

      await debouncedActivateStarterMods();
      const { extensions: activatedModComponents } =
        await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(1);

      expect(activatedModComponents[0].optionsArgs).toStrictEqual({
        // Activated with the ID of the database created
        database: databaseId,
      });
    });

    test("optional database is not created", async () => {
      // Mark DB as optional
      const modDefinition = modFactory();
      modDefinition.options.schema.required = [];

      axiosMock
        .onGet("/api/onboarding/starter-blueprints/")
        .reply(200, [modDefinition]);

      await debouncedActivateStarterMods();
      const { extensions: activatedModComponents } =
        await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(1);

      // Database should not be created
      expect(activatedModComponents[0].optionsArgs).toStrictEqual({});
    });

    test("database is not created if already exists", async () => {
      const modDefinition = modFactory();
      const databaseId = autoUUIDSequence();
      const databaseName = "Test Mod - Test Database";
      const database = databaseFactory({ id: databaseId, name: databaseName });

      axiosMock
        .onGet("/api/onboarding/starter-blueprints/")
        .reply(200, [modDefinition])
        .onGet("/api/databases/")
        .reply(200, [database])
        .onPost("/api/databases/")
        // Should not be called
        .reply(400);

      await debouncedActivateStarterMods();
      const { extensions: activatedModComponents } =
        await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(1);

      expect(activatedModComponents[0].optionsArgs).toStrictEqual({
        // Activated with the ID of the database created
        database: databaseId,
      });

      expect(axiosMock.history.post).toHaveLength(0);
    });
  });
});
