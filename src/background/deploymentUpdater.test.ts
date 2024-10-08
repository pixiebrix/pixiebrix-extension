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
  getModComponentState,
  saveModComponentState,
} from "@/store/modComponents/modComponentStorage";
import { uuidv4, normalizeSemVerString } from "@/types/helpers";
import { appApiMock } from "@/testUtils/appApiMock";
import { omit } from "lodash";
import {
  startupDeploymentUpdateLoaded,
  syncDeployments,
} from "@/background/deploymentUpdater";
import reportEvent from "@/telemetry/reportEvent";
import { isLinked, readAuthData } from "@/auth/authStorage";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { isUpdateAvailable } from "@/background/installer";
import {
  getSettingsState,
  saveSettingsState,
} from "@/store/settings/settingsStorage";
import { getEditorState, saveEditorState } from "@/store/editorStorage";
import {
  editorSlice,
  initialState as initialEditorState,
} from "@/pageEditor/store/editor/editorSlice";
import { type ButtonFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { parsePackage } from "@/registry/packageRegistry";
import { registry } from "@/background/messenger/api";
import { INTERNAL_reset as resetManagedStorage } from "@/store/enterprise/managedStorage";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { TEST_setContext } from "webext-detect";
import {
  activatedModComponentFactory,
  modComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { personalSharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import {
  modComponentDefinitionFactory,
  starterBrickDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";

import { activatableDeploymentFactory } from "@/testUtils/factories/deploymentFactories";
import { packageConfigDetailFactory } from "@/testUtils/factories/brickFactories";
import { type RegistryPackage } from "@/types/contract";
import { resetMeApiMocks } from "@/testUtils/userMock";
import { TEST_deleteFeatureFlagsCache } from "@/auth/featureFlagStorage";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import {
  queueReloadModEveryTab,
  reloadModsEveryTab,
} from "@/contentScript/messenger/api";
import { adapter } from "@/pageEditor/starterBricks/adapter";
import { API_PATHS } from "@/data/service/urlPaths";

TEST_setContext("background");

jest.mock("@/store/settings/settingsStorage");

jest.mock("@/hooks/useRefreshRegistries");

jest.mock("@/utils/extensionUtils", () => ({
  ...jest.requireActual("@/utils/extensionUtils"),
  forEachTab: jest.fn(),
}));

// Override manual mock to support `expect` assertions
jest.mock("@/telemetry/reportEvent");

jest.mock("@/sidebar/messenger/api", () => {});
jest.mock("@/contentScript/messenger/api");

jest.mock("@/auth/authStorage", () => ({
  getExtensionToken: async () => "TESTTOKEN",
  getAuthHeaders: jest.fn().mockResolvedValue({}),
  readAuthData: jest.fn().mockResolvedValue({
    organizationId: "00000000-00000000-00000000-00000000",
  }),
  isLinked: jest.fn().mockResolvedValue(true),
  async updateUserData() {},
  addListener: jest.fn(),
  TEST_setAuthData: jest.fn(),
}));

jest.mock("@/background/installer", () => ({
  isUpdateAvailable: jest.fn().mockReturnValue(false),
}));

// This comes up in the extensions slice redux-persist migrations that run when mod component state is loaded
jest.mock("@/auth/authUtils", () => {
  const actual = jest.requireActual("@/auth/authUtils");
  return {
    ...actual,
    getUserScope: jest.fn(() => "@test-user"),
  };
});

const registryFindMock = jest.mocked(registry.find);

const isLinkedMock = jest.mocked(isLinked);
const readAuthDataMock = jest.mocked(readAuthData);
const openOptionsPageMock = jest.mocked(browser.runtime.openOptionsPage);
const browserManagedStorageMock = jest.mocked(browser.storage.managed.get);
const refreshRegistriesMock = jest.mocked(refreshRegistries);
const isUpdateAvailableMock = jest.mocked(isUpdateAvailable);
const getSettingsStateMock = jest.mocked(getSettingsState);
const saveSettingsStateMock = jest.mocked(saveSettingsState);
const reloadModsEveryTabMock = jest.mocked(reloadModsEveryTab);
const queueReloadModEveryTabMock = jest.mocked(queueReloadModEveryTab);

async function clearEditorReduxState() {
  await browser.storage.local.remove("persist:editor");
}

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  appApiMock.reset();

  appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
    flags: [],
  });

  // Reset local states
  await Promise.all([
    saveModComponentState({ activatedModComponents: [] }),
    clearEditorReduxState(),
  ]);

  getSettingsStateMock.mockResolvedValue({
    nextUpdate: undefined,
  } as any);

  browserManagedStorageMock.mockResolvedValue({});

  readAuthDataMock.mockResolvedValue({
    organizationId: "00000000-00000000-00000000-00000000",
  } as any);

  await resetManagedStorage();
  await startupDeploymentUpdateLoaded.unset();
  refreshRegistriesMock.mockReset();
});

afterEach(async () => {
  await TEST_deleteFeatureFlagsCache();
  await resetMeApiMocks();
});

describe("syncDeployments", () => {
  test("opens options page if managed enterprise customer not linked", async () => {
    readAuthDataMock.mockResolvedValue({
      organizationId: null,
    });

    browserManagedStorageMock.mockResolvedValue({
      managedOrganizationId: "00000000-00000000-00000000-00000000",
    });

    isLinkedMock.mockResolvedValue(false);

    await syncDeployments();

    expect(reportEvent).toHaveBeenCalledWith(
      "OrganizationExtensionLink",
      expect.anything(),
    );
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("launches SSO flow if SSO enterprise customer not linked", async () => {
    readAuthDataMock.mockResolvedValue({
      organizationId: null,
    });

    browserManagedStorageMock.mockResolvedValue({
      ssoUrl: "https://sso.example.com",
    });

    isLinkedMock.mockResolvedValue(false);

    await syncDeployments();

    expect(reportEvent).toHaveBeenCalledWith(
      "OrganizationExtensionLink",
      expect.objectContaining({
        sso: true,
      }),
    );

    expect(openOptionsPageMock.mock.calls).toHaveLength(0);

    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: "https://sso.example.com",
      active: false,
    });
  });

  test.each([null, uuidv4()])(
    "do not launch sso flow if disableLoginTab, with cached organization id: %s",
    async (organizationId) => {
      isLinkedMock.mockResolvedValue(false);
      // The organizationId doesn't currently impact the logic. Vary it to catch regressions
      readAuthDataMock.mockResolvedValue({
        organizationId,
      });
      browserManagedStorageMock.mockResolvedValue({
        ssoUrl: "https://sso.example.com",
        disableLoginTab: true,
      });

      await syncDeployments();

      expect(openOptionsPageMock).not.toHaveBeenCalled();
      expect(browser.tabs.create).not.toHaveBeenCalled();
    },
  );

  test("opens options page if enterprise customer becomes unlinked", async () => {
    // `readAuthDataMock` already has organizationId "00000000-00000000-00000000-00000000"
    isLinkedMock.mockResolvedValue(false);

    await syncDeployments();

    expect(reportEvent).toHaveBeenCalledWith(
      "OrganizationExtensionLink",
      expect.anything(),
    );
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("can add deployment from empty state if deployment has permissions", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(1);
    expect(saveSettingsStateMock).toHaveBeenCalledTimes(1);
  });

  test("reload mods on existing tabs immediately on startup", async () => {
    await startupDeploymentUpdateLoaded.set(false);
    isLinkedMock.mockResolvedValue(true);

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    await expect(startupDeploymentUpdateLoaded.get()).resolves.toBe(true);
    expect(reloadModsEveryTabMock).toHaveBeenCalledOnce();
    expect(queueReloadModEveryTabMock).not.toHaveBeenCalled();
  });

  test("queue mods on existing tabs after first update after startup", async () => {
    await startupDeploymentUpdateLoaded.set(true);
    isLinkedMock.mockResolvedValue(true);

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    // Session value remains set to true
    await expect(startupDeploymentUpdateLoaded.get()).resolves.toBe(true);
    expect(reloadModsEveryTabMock).not.toHaveBeenCalled();
    expect(queueReloadModEveryTabMock).toHaveBeenCalledOnce();
  });

  test("can activate clipboardWrite automatically by default", async () => {
    isLinkedMock.mockResolvedValue(true);
    // XXX: would be better to adjust mocking to allow integration test with checkDeploymentPermissions
    jest.mocked(checkDeploymentPermissions).mockResolvedValueOnce({
      hasPermissions: true,
      permissions: {
        permissions: ["clipboardWrite"],
      },
    });

    const { deployment, modDefinition } = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            permissions: {
              permissions: ["clipboardWrite"],
            },
          }),
        ],
      },
    });
    const registryId = deployment.package.package_id;

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();

    expect(jest.mocked(checkDeploymentPermissions).mock.calls[0]).toStrictEqual(
      [
        {
          activatableDeployment: {
            deployment,
            modDefinition: omit(modDefinition, "options"),
          },
          locate: expect.anything(),
          optionalPermissions: ["clipboardWrite"],
        },
      ],
    );

    expect(activatedModComponents).toHaveLength(1);
  });

  test("ignore other mod components", async () => {
    isLinkedMock.mockResolvedValue(true);

    const starterBrick = starterBrickDefinitionFactory();
    const packageVersion = {
      ...parsePackage(starterBrick as unknown as RegistryPackage),
      timestamp: new Date(),
    };
    registryFindMock.mockResolvedValue(packageVersion);

    // A mod without a deployment. Exclude _deployment entirely to handle the case where the property is missing
    const manualModComponent = activatedModComponentFactory({
      extensionPointId: starterBrick.metadata!.id,
      _recipe: modMetadataFactory(),
    });
    delete manualModComponent._deployment;

    await saveModComponentState({
      activatedModComponents: [manualModComponent],
    });

    let editorState = initialEditorState;
    const { fromModComponent } = adapter(starterBrick.definition.type);
    const editorComponentFormState = (await fromModComponent(
      manualModComponent,
    )) as ButtonFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addModComponentFormState(editorComponentFormState),
    );
    await saveEditorState(editorState);

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();
    expect(activatedModComponents).toBeArrayOfSize(2);
    const foo = await getEditorState();
    // Expect unrelated draft mod component not to be removed
    expect(foo!.modComponentFormStates).toBeArrayOfSize(1);
  });

  test("deactivate existing mod with no draft mod components", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    // A mod component without a recipe. Exclude _recipe entirely to handle the case where the property is missing
    const modComponent = modComponentFactory({
      _recipe: {
        id: deployment.package.package_id,
        name: deployment.package.name,
        version: normalizeSemVerString("0.0.1"),
        updated_at: deployment.updated_at!,
        sharing: personalSharingDefinitionFactory(),
      },
    }) as ActivatedModComponent;
    delete modComponent._deployment;

    await saveModComponentState({
      activatedModComponents: [modComponent],
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    // Make sure we're testing the case where getEditorState() returns undefined
    await expect(getEditorState()).resolves.toBeUndefined();

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();
    expect(activatedModComponents).toBeArrayOfSize(1);
    expect(activatedModComponents[0]!._recipe!.version).toBe(
      deployment.package.version,
    );
  });

  test("deactivate existing mod with draft mod components", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    const starterBrick = starterBrickDefinitionFactory();
    const brick = {
      ...parsePackage(starterBrick as unknown as RegistryPackage),
      timestamp: new Date(),
    };
    registryFindMock.mockResolvedValue(brick);

    // A mod component without a recipe. Exclude _recipe entirely to handle the case where the property is missing
    const modComponent = modComponentFactory({
      extensionPointId: starterBrick.metadata!.id,
      _recipe: {
        id: deployment.package.package_id,
        name: deployment.package.name,
        version: normalizeSemVerString("0.0.1"),
        updated_at: deployment.updated_at!,
        sharing: personalSharingDefinitionFactory(),
      },
    }) as ActivatedModComponent;
    delete modComponent._deployment;

    await saveModComponentState({
      activatedModComponents: [modComponent],
    });

    let editorState = initialEditorState;
    const { fromModComponent } = adapter(StarterBrickTypes.BUTTON);
    const element = (await fromModComponent(modComponent)) as ButtonFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addModComponentFormState(element),
    );
    await saveEditorState(editorState);

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();
    expect(activatedModComponents).toBeArrayOfSize(1);
    const { modComponentFormStates } = (await getEditorState()) ?? {};
    // Expect draft mod component to be removed
    expect(modComponentFormStates).toBeArrayOfSize(0);
    expect(activatedModComponents[0]!._recipe!.version).toBe(
      deployment.package.version,
    );
  });

  test("opens options page if deployment does not have necessary permissions", async () => {
    isLinkedMock.mockResolvedValue(true);
    jest.mocked(checkDeploymentPermissions).mockResolvedValueOnce({
      hasPermissions: false,
      permissions: emptyPermissionsFactory(),
    });

    const { deployment, modDefinition } = activatableDeploymentFactory();
    const registryId = deployment.package.package_id;

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(0);
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("opens options page in strict permission mode if optional permission missing", async () => {
    isLinkedMock.mockResolvedValue(true);
    // XXX: would be better to adjust mocking to allow integration test with checkDeploymentPermissions
    jest.mocked(checkDeploymentPermissions).mockResolvedValueOnce({
      hasPermissions: false,
      permissions: {
        permissions: ["clipboardWrite"],
      },
    });

    const { deployment, modDefinition } = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            permissions: {
              permissions: ["clipboardWrite"],
            },
          }),
        ],
      },
    });
    const registryId = deployment.package.package_id;

    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: ["deployment-permissions-strict"],
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock.onGet(API_PATHS.REGISTRY_BRICK(registryId)).reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();

    expect(jest.mocked(checkDeploymentPermissions).mock.calls[0]).toStrictEqual(
      [
        {
          activatableDeployment: {
            deployment,
            modDefinition: omit(modDefinition, "options"),
          },
          locate: expect.anything(),
          optionalPermissions: [],
        },
      ],
    );

    expect(activatedModComponents).toHaveLength(0);
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("skip update and deactivation if not linked", async () => {
    isLinkedMock.mockResolvedValue(false);
    readAuthDataMock.mockResolvedValue({} as any);

    jest.doMock("@/background/deploymentUpdater");

    const { deactivateAllDeployedMods } = await import(
      "@/background/deploymentUpdater"
    );

    await syncDeployments();

    expect(jest.mocked(deactivateAllDeployedMods).mock.calls).toHaveLength(0);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(0);
    expect(saveSettingsStateMock).toHaveBeenCalledTimes(0);
  }, 10_000);

  test("do not open options page on update if restricted-version flag not set", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, []);

    await syncDeployments();

    expect(isUpdateAvailableMock.mock.calls).toHaveLength(1);
    expect(openOptionsPageMock.mock.calls).toHaveLength(0);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(0);
  });

  test("open options page if refresh registries fails", async () => {
    refreshRegistriesMock.mockRejectedValue(new Error("test error"));
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(false);

    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: ["restricted-version"],
    });

    const { deployment } = activatableDeploymentFactory();
    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    await syncDeployments();

    expect(isUpdateAvailableMock.mock.calls).toHaveLength(1);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(1);
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("open options page on update if restricted-version flag is set", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);

    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: ["restricted-version"],
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, []);

    await syncDeployments();

    expect(isUpdateAvailableMock.mock.calls).toHaveLength(1);
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(0);
  });

  test("open options page on update if enforce_update_millis is set even if snoozed", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);

    getSettingsStateMock.mockResolvedValue({
      nextUpdate: Date.now() + 1_000_000,
      updatePromptTimestamp: null,
    } as any);

    appApiMock.onGet(API_PATHS.ME).reply(200, {
      flags: [],
      enforce_update_millis: 5000,
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, []);

    await syncDeployments();

    expect(isUpdateAvailableMock.mock.calls).toHaveLength(1);
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(0);
  });

  test("do not open options page if enforce_update_millis is set but no updates available", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(false);

    getSettingsStateMock.mockResolvedValue({
      nextUpdate: Date.now() + 1_000_000,
      updatePromptTimestamp: null,
    } as any);

    appApiMock.onGet(API_PATHS.ME).reply(200, {
      flags: [],
      enforce_update_millis: 5000,
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, []);

    await syncDeployments();

    expect(isUpdateAvailableMock.mock.calls).toHaveLength(1);
    expect(openOptionsPageMock.mock.calls).toHaveLength(0);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(0);
  });

  test("skip update if snoozed", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);
    getSettingsStateMock.mockResolvedValue({
      nextUpdate: Date.now() + 1_000_000,
    } as any);

    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: ["restricted-version"],
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, []);

    await syncDeployments();

    // Unassigned deployments are always deactivated if snoozed
    expect(isUpdateAvailableMock.mock.calls).toHaveLength(0);
    expect(refreshRegistriesMock.mock.calls).toHaveLength(0);
    expect(openOptionsPageMock.mock.calls).toHaveLength(0);
  });

  test("can deactivate all deployed mods", async () => {
    const manualModStarterBrickDefinition = starterBrickDefinitionFactory();
    const manualModStarterBrickPackageVersion = {
      ...parsePackage(
        manualModStarterBrickDefinition as unknown as RegistryPackage,
      ),
      timestamp: new Date(),
    };

    const manuallyActivatedModComponent = activatedModComponentFactory({
      _recipe: modMetadataFactory(),
    });

    const deploymentStarterBrickDefinition = starterBrickDefinitionFactory();
    const deploymentStarterBrickPackageVersion = {
      ...parsePackage(
        deploymentStarterBrickDefinition as unknown as RegistryPackage,
      ),
      timestamp: new Date(),
    };

    const deploymentModComponent = modComponentFactory({
      extensionPointId: deploymentStarterBrickDefinition.metadata!.id,
      _deployment: { id: uuidv4(), timestamp: "2021-10-07T12:52:16.189Z" },
      _recipe: modMetadataFactory(),
    }) as ActivatedModComponent;

    registryFindMock.mockImplementation(async (id) => {
      if (id === manualModStarterBrickPackageVersion.id) {
        return manualModStarterBrickPackageVersion;
      }

      return deploymentStarterBrickPackageVersion;
    });

    let editorState = initialEditorState;

    const manualModAdapter = adapter(
      manualModStarterBrickDefinition.definition.type,
    );
    const manualModComponentEditorFormState =
      (await manualModAdapter.fromModComponent(
        manuallyActivatedModComponent,
      )) as ButtonFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addModComponentFormState(
        manualModComponentEditorFormState,
      ),
    );

    const deploymentModComponentAdapter = adapter(
      deploymentStarterBrickDefinition.definition.type,
    );
    const deploymentElement =
      (await deploymentModComponentAdapter.fromModComponent(
        deploymentModComponent,
      )) as ButtonFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addModComponentFormState(deploymentElement),
    );

    await saveModComponentState({
      activatedModComponents: [
        deploymentModComponent,
        manuallyActivatedModComponent,
      ],
    });
    await saveEditorState(editorState);

    isLinkedMock.mockResolvedValue(true);
    readAuthDataMock.mockResolvedValue({} as any);

    await syncDeployments();

    const { activatedModComponents } = await getModComponentState();

    expect(activatedModComponents).toHaveLength(1);

    const activatedModComponentIds = activatedModComponents.map((x) => x.id);
    expect(activatedModComponentIds).toContain(
      manuallyActivatedModComponent.id,
    );

    const { modComponentFormStates } = (await getEditorState()) ?? {};
    expect(modComponentFormStates).toBeArrayOfSize(1);
    expect(modComponentFormStates![0]!).toEqual(
      manualModComponentEditorFormState,
    );
  });

  test("deactivates old mod when deployed mod id is changed", async () => {
    isLinkedMock.mockResolvedValue(true);

    const { deployment, modDefinition } = activatableDeploymentFactory();

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [deployment]);

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICK(deployment.package.package_id))
      .reply(
        200,
        packageConfigDetailFactory({
          modDefinition,
          packageVersionUUID: deployment.package.id,
        }),
      );

    await syncDeployments();
    const { activatedModComponents } = await getModComponentState();
    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]!._recipe!.id).toBe(
      deployment.package.package_id,
    );

    // Remove package from the deployment so that it can be updated
    const { package: deploymentPackage, ...prevDeployment } = deployment;
    const {
      deployment: updatedDeployment,
      modDefinition: updatedModDefinition,
    } = activatableDeploymentFactory({
      deploymentOverride: {
        ...prevDeployment,
      },
    });

    appApiMock.onPost(API_PATHS.DEPLOYMENTS).reply(201, [updatedDeployment]);

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICK(updatedDeployment.package.package_id))
      .reply(
        200,
        packageConfigDetailFactory({
          modDefinition: updatedModDefinition,
          packageVersionUUID: updatedDeployment.package.id,
        }),
      );

    await syncDeployments();
    const { activatedModComponents: expectedModComponents } =
      await getModComponentState();
    expect(expectedModComponents).toHaveLength(1);
    expect(expectedModComponents[0]!._recipe!.id).toBe(
      updatedDeployment.package.package_id,
    );
  });
});
