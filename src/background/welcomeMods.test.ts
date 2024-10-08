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

import { debouncedActivateWelcomeMods } from "@/background/welcomeMods";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/modComponents/modComponentStorage";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { isLinked } from "@/auth/authStorage";
import { refreshRegistries } from "./refreshRegistries";
import { uuidv4 } from "@/types/helpers";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import {
  defaultModDefinitionFactory,
  getModDefinitionWithBuiltInIntegrationConfigs,
} from "@/testUtils/factories/modDefinitionFactories";
import {
  meApiResponseFactory,
  meOrganizationApiResponseFactory,
} from "@/testUtils/factories/authFactories";
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
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import {
  PIXIEBRIX_INTEGRATION_CONFIG_ID,
  PIXIEBRIX_INTEGRATION_ID,
} from "@/integrations/constants";
import { databaseFactory } from "@/testUtils/factories/databaseFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { getBuiltInIntegrationConfigs } from "@/background/getBuiltInIntegrationConfigs";
import {
  mapRestrictedFeatureToFeatureFlag,
  RestrictedFeatures,
} from "@/auth/featureFlags";
import {
  TEST_deleteFeatureFlagsCache,
  TEST_overrideFeatureFlags,
} from "@/auth/featureFlagStorage";
import { API_PATHS } from "@/data/service/urlPaths";

const axiosMock = new MockAdapter(axios);

jest.mock("@/auth/authStorage", () => ({
  async getAuthHeaders() {
    return {};
  },
  isLinked: jest.fn().mockResolvedValue(true),
  addListener: jest.fn(),
}));

jest.mock("@/contentScript/messenger/api");
jest.mock("./refreshRegistries");

// This comes up in the extensions slice redux-persist migrations that run when mod component state is loaded
jest.mock("@/auth/authUtils", () => {
  const actual = jest.requireActual("@/auth/authUtils");
  return {
    ...actual,
    getUserScope: jest.fn(() => "@test-user"),
  };
});

const isLinkedMock = jest.mocked(isLinked);
const refreshRegistriesMock = jest.mocked(refreshRegistries);

jest.useFakeTimers();

beforeEach(async () => {
  jest.resetModules();
  jest.runAllTimers();

  // Reset local options state
  await saveModComponentState({
    activatedModComponents: [],
  });
  await saveSidebarState({ closedTabs: {} });

  jest.clearAllMocks();

  await TEST_deleteFeatureFlagsCache();

  axiosMock.onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED).reply(200, []);

  axiosMock.onGet(API_PATHS.ME).reply(
    200,
    meApiResponseFactory({
      flags: [],
    }),
  );
});

describe("debouncedActivateWelcomeMods", () => {
  function overrideStarterBrickType(
    modDefinition: ModDefinition,
    type: StarterBrickType,
  ) {
    return produce(modDefinition, (draft) => {
      (
        draft.definitions!.extensionPoint!
          .definition as StarterBrickDefinitionProp
      ).type = type;
    });
  }

  test("user has welcome mods available to activate, with sidebar starter bricks", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = overrideStarterBrickType(
      defaultModDefinitionFactory(),
      StarterBrickTypes.SIDEBAR_PANEL,
    );

    axiosMock
      .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
      .reply(200, [modDefinition]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]!.modMetadata.id).toEqual(
      modDefinition.metadata.id,
    );

    expect(closedTabs).toStrictEqual({
      [getEventKeyForPanel(activatedModComponents[0]!.id)]: true,
      [eventKeyForEntry(MOD_LAUNCHER)]: false,
    });

    expect(refreshRegistriesMock).toHaveBeenCalledOnce();
  });

  test("user has welcome mods available to activate, no sidebar starter bricks", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();

    axiosMock
      .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
      .reply(200, [modDefinition]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]!.modMetadata.id).toEqual(
      modDefinition.metadata.id,
    );

    expect(closedTabs).toStrictEqual({});

    expect(refreshRegistriesMock).toHaveBeenCalledOnce();
  });

  test("getBuiltInIntegrationConfigs", async () => {
    axiosMock.onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED).reply(200, [
      remoteIntegrationConfigurationFactory(),
      remoteIntegrationConfigurationFactory({
        organization: meOrganizationApiResponseFactory(),
      }),
      remoteIntegrationConfigurationFactory({ user: uuidv4() }),
    ]);

    let builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();
    expect(builtInIntegrationConfigs).toBeArrayOfSize(1);

    axiosMock.onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED).reply(200, []);

    builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();
    expect(builtInIntegrationConfigs).toBeArrayOfSize(0);

    axiosMock.onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED).reply(500);

    builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();
    expect(builtInIntegrationConfigs).toBeArrayOfSize(0);
  });

  test("welcome mods request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS).reply(500);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(0);
  });

  test("activate welcome mod with built-in auths", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition: _modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();

    const modDefinition = overrideStarterBrickType(
      _modDefinition,
      StarterBrickTypes.SIDEBAR_PANEL,
    );

    axiosMock
      .onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED)
      .reply(200, builtInIntegrationConfigs);

    axiosMock
      .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
      .reply(200, [modDefinition]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toBeArrayOfSize(1);
    const activatedModComponent = activatedModComponents[0]!;

    expect(closedTabs).toStrictEqual({
      [getEventKeyForPanel(activatedModComponent.id)]: true,
      [eventKeyForEntry(MOD_LAUNCHER)]: false,
    });

    expect(activatedModComponent.extensionPointId).toBe(
      modDefinition.extensionPoints[0]!.id,
    );
    expect(activatedModComponent.integrationDependencies).toBeArrayOfSize(2);

    const dependency1 = activatedModComponent.integrationDependencies!.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service1",
    )!;
    const dependency2 = activatedModComponent.integrationDependencies!.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service2",
    )!;

    expect(dependency1.configId).toBe(builtInIntegrationConfigs[0]!.id);
    expect(dependency2.configId).toBe(builtInIntegrationConfigs[1]!.id);
  });

  test("welcome mod already activated", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();

    const activatedModComponent = activatedModComponentFactory({
      modMetadata: modMetadataFactory({ id: modDefinition.metadata.id }),
    });
    await saveModComponentState({
      activatedModComponents: [activatedModComponent],
    });

    axiosMock.onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS).reply(200, [
      {
        ...modDefinition,
        extensionPoints: [activatedModComponent],
      },
    ]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();
    const { closedTabs } = await getSidebarState();

    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]!.modMetadata.id).toEqual(
      modDefinition.metadata.id,
    );

    expect(closedTabs).toStrictEqual({});
  });

  test("activate welcome mod with optional integrations", async () => {
    isLinkedMock.mockResolvedValue(true);

    const modDefinition = defaultModDefinitionFactory();
    modDefinition.extensionPoints[0]!.services = {
      properties: {
        google: {
          $ref: "https://app.pixiebrix.com/schemas/services/google/oauth2-pkce",
        },
      },
      required: [],
    };

    axiosMock
      .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
      .reply(200, [modDefinition]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(1);
    const activatedModComponent = activatedModComponents[0]!;
    expect(activatedModComponent.modMetadata.id).toEqual(
      modDefinition.metadata.id,
    );
    expect(activatedModComponent.integrationDependencies).toBeArrayOfSize(1);
    // Expect the optional dependency NOT to be configured
    expect(
      activatedModComponent.integrationDependencies![0]!.configId,
    ).toBeUndefined();
  });

  test("activate welcome mods with optional integrations, 1 with built-in auth", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();
    modDefinition.extensionPoints[0]!.services = {
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
      .onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED)
      .reply(200, builtInIntegrationConfigs);

    axiosMock
      .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
      .reply(200, [modDefinition]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toBeArrayOfSize(1);

    const activatedModComponent1 = activatedModComponents[0]!;
    expect(activatedModComponent1.extensionPointId).toBe(
      modDefinition.extensionPoints[0]!.id,
    );
    expect(activatedModComponent1.integrationDependencies).toBeArrayOfSize(2);

    const dependency1 = activatedModComponent1.integrationDependencies!.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service1",
    )!;
    const dependency2 = activatedModComponent1.integrationDependencies!.find(
      ({ integrationId }) => integrationId === "@pixiebrix/service2",
    )!;

    // Expect the optional dependency NOT to be configured
    expect(dependency1.configId).toBe(builtInIntegrationConfigs[0]!.id);
    // Expect the required dependency to be configured
    expect(dependency2.configId).toBe(builtInIntegrationConfigs[1]!.id);
  });

  test("activate welcome mod with required pixiebrix integration", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { modDefinition } = getModDefinitionWithBuiltInIntegrationConfigs();
    modDefinition.extensionPoints[0]!.services = {
      type: "object",
      properties: {
        service: {
          $ref: `https://app.pixiebrix.com/schemas/services/${PIXIEBRIX_INTEGRATION_ID}`,
        },
      },
      required: ["service"],
    };

    axiosMock.onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED).reply(200, []);

    axiosMock
      .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
      .reply(200, [modDefinition]);

    await debouncedActivateWelcomeMods();
    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toBeArrayOfSize(1);

    const activatedModComponent = activatedModComponents[0]!;
    expect(activatedModComponent.extensionPointId).toBe(
      modDefinition.extensionPoints[0]!.id,
    );
    expect(activatedModComponent.integrationDependencies).toBeArrayOfSize(1);

    const dependency = activatedModComponent.integrationDependencies!.find(
      ({ integrationId }) => integrationId === PIXIEBRIX_INTEGRATION_ID,
    )!;

    // As of 1.8.13, a sentinel value is used for the configId of the integration to simplify strict null checks
    expect(dependency.configId).toBe(PIXIEBRIX_INTEGRATION_CONFIG_ID);
  });

  describe("databases", () => {
    beforeEach(() => {
      isLinkedMock.mockResolvedValue(true);
      axiosMock.resetHistory();
      axiosMock.onGet(API_PATHS.INTEGRATIONS_SHARED_SANITIZED).reply(200, []);
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

      modDefinition.extensionPoints[0]!.services = {
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

    test("activate welcome mod with required pixiebrix database", async () => {
      const modDefinition = modFactory();
      const databaseId = autoUUIDSequence();

      axiosMock
        .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
        .reply(200, [modDefinition])
        .onGet(API_PATHS.DATABASES)
        .reply(200, [])
        .onPost(API_PATHS.DATABASES)
        .reply((args) => {
          const data = JSON.parse(args.data) as UnknownObject;
          expect(data).toStrictEqual({ name: "Test Mod - Test Database" });

          return [
            201,
            databaseFactory({ id: databaseId, name: data.name as string }),
          ];
        });

      await debouncedActivateWelcomeMods();
      const { activatedModComponents } = await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(1);

      expect(activatedModComponents[0]!.optionsArgs).toStrictEqual({
        // Activated with the ID of the database created
        database: databaseId,
      });
    });

    test("optional database is not created", async () => {
      // Mark DB as optional
      const modDefinition = modFactory();
      modDefinition.options!.schema.required = [];

      axiosMock
        .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
        .reply(200, [modDefinition]);

      await debouncedActivateWelcomeMods();
      const { activatedModComponents } = await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(1);

      // Database should not be created
      expect(activatedModComponents[0]!.optionsArgs).toStrictEqual({});
    });

    test("database is not created if already exists", async () => {
      const modDefinition = modFactory();
      const databaseId = autoUUIDSequence();
      const databaseName = "Test Mod - Test Database";
      const database = databaseFactory({ id: databaseId, name: databaseName });

      axiosMock
        .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
        .reply(200, [modDefinition])
        .onGet(API_PATHS.DATABASES)
        .reply(200, [database])
        .onPost(API_PATHS.DATABASES)
        // Should not be called
        .reply(400);

      await debouncedActivateWelcomeMods();
      const { activatedModComponents } = await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(1);

      expect(activatedModComponents[0]!.optionsArgs).toStrictEqual({
        // Activated with the ID of the database created
        database: databaseId,
      });

      expect(axiosMock.history.post).toHaveLength(0);
    });
  });

  describe("organization policy", () => {
    it("rejects if restricted-marketplace flag set", async () => {
      const modDefinition = defaultModDefinitionFactory();

      await TEST_overrideFeatureFlags([
        mapRestrictedFeatureToFeatureFlag(RestrictedFeatures.MARKETPLACE),
      ]);

      axiosMock
        .onGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS)
        .reply(200, [modDefinition]);

      const { error } = await debouncedActivateWelcomeMods();

      expect(error).toBe(
        "Your team's policy does not permit you to activate marketplace mods. Contact your team admin for assistance",
      );

      const { activatedModComponents } = await getModComponentState();

      expect(activatedModComponents).toBeArrayOfSize(0);
    });
  });
});
