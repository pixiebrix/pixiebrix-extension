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

import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import {
  deploymentFactory,
  extensionFactory,
  extensionPointDefinitionFactory,
  installedRecipeMetadataFactory,
  sharingDefinitionFactory,
} from "@/testUtils/factories";
import { uuidv4, validateSemVerString } from "@/types/helpers";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { updateDeployments } from "@/background/deployment";
import { reportEvent } from "@/telemetry/events";
import { isLinked, readAuthData } from "@/auth/token";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { isUpdateAvailable } from "@/background/installer";
import { getSettingsState, saveSettingsState } from "@/store/settingsStorage";
import { getEditorState, saveEditorState } from "@/store/dynamicElementStorage";
import {
  editorSlice,
  initialState as initialEditorState,
} from "@/pageEditor/slices/editorSlice";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { type ActionFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { parsePackage } from "@/registry/localRegistry";
import { registry } from "@/background/messenger/api";
import { INTERNAL_reset as resetManagedStorage } from "@/store/enterprise/managedStorage";
import { type PersistedExtension } from "@/types/extensionTypes";
import { type Timestamp } from "@/types/stringTypes";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { setContext } from "@/testUtils/detectPageMock";

setContext("background");
const axiosMock = new MockAdapter(axios);

jest.mock("@/store/settingsStorage", () => ({
  getSettingsState: jest.fn(),
  saveSettingsState: jest.fn(),
}));

jest.mock("@/hooks/useRefreshRegistries", () => ({
  refreshRegistries: jest.fn(),
}));

jest.mock("@/background/activeTab", () => ({
  forEachTab: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("webext-messenger");

// Override manual mock to support `expect` assertions
jest.mock("@/telemetry/events", () => ({
  reportEvent: jest.fn(),
}));

jest.mock("@/sidebar/messenger/api", () => {});
jest.mock("@/contentScript/messenger/api", () => ({
  insertButton: jest.fn(),
}));

jest.mock("@/auth/token", () => ({
  getExtensionToken: async () => "TESTTOKEN",
  getAuthHeaders: jest.fn().mockResolvedValue({}),
  readAuthData: jest.fn().mockResolvedValue({
    organizationId: "00000000-00000000-00000000-00000000",
  }),
  isLinked: jest.fn().mockResolvedValue(true),
  async updateUserData() {},
}));

jest.mock("@/background/installer", () => ({
  isUpdateAvailable: jest.fn().mockReturnValue(false),
}));

const registryFindMock = registry.find as jest.MockedFunction<
  typeof registry.find
>;

const isLinkedMock = isLinked as jest.Mock;
const readAuthDataMock = readAuthData as jest.Mock;
const getManifestMock = browser.runtime.getManifest as jest.Mock;
const openOptionsPageMock = browser.runtime.openOptionsPage as jest.Mock;
const browserManagedStorageMock = browser.storage.managed.get as jest.Mock;
const refreshRegistriesMock = refreshRegistries as unknown as jest.Mock;
const isUpdateAvailableMock = isUpdateAvailable as jest.Mock;
const getSettingsStateMock = getSettingsState as jest.Mock;
const saveSettingsStateMock = saveSettingsState as jest.Mock;

async function clearEditorReduxState() {
  await browser.storage.local.remove("persist:editor");
}

beforeEach(async () => {
  jest.resetModules();

  // Reset local states
  await Promise.all([saveOptions({ extensions: [] }), clearEditorReduxState()]);

  isLinkedMock.mockClear();
  readAuthDataMock.mockClear();

  getSettingsStateMock.mockClear();
  saveSettingsStateMock.mockClear();

  getSettingsStateMock.mockResolvedValue({
    nextUpdate: undefined,
  });

  browserManagedStorageMock.mockResolvedValue({});

  readAuthDataMock.mockResolvedValue({
    organizationId: "00000000-00000000-00000000-00000000",
  });

  getManifestMock.mockClear();
  refreshRegistriesMock.mockClear();
  openOptionsPageMock.mockClear();
  isUpdateAvailableMock.mockClear();

  resetManagedStorage();
});

describe("updateDeployments", () => {
  test("opens options page if managed enterprise customer not linked", async () => {
    readAuthDataMock.mockResolvedValue({
      organizationId: null,
    });

    browserManagedStorageMock.mockResolvedValue({
      managedOrganizationId: "00000000-00000000-00000000-00000000",
    });

    isLinkedMock.mockResolvedValue(false);

    await updateDeployments();

    expect(reportEvent).toHaveBeenCalledWith(
      "OrganizationExtensionLink",
      expect.anything()
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

    await updateDeployments();

    expect(reportEvent).toHaveBeenCalledWith(
      "OrganizationExtensionLink",
      expect.objectContaining({
        sso: true,
      })
    );

    expect(openOptionsPageMock.mock.calls).toHaveLength(0);

    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: "https://sso.example.com",
      active: false,
    });
  });

  test("opens options page if enterprise customer becomes unlinked", async () => {
    // `readAuthDataMock` already has organizationId "00000000-00000000-00000000-00000000"
    isLinkedMock.mockResolvedValue(false);

    await updateDeployments();

    expect(reportEvent).toHaveBeenCalledWith(
      "OrganizationExtensionLink",
      expect.anything()
    );
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("can add deployment from empty state if deployment has permissions", async () => {
    isLinkedMock.mockResolvedValue(true);

    const deployment = deploymentFactory();

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, [deployment]);

    await updateDeployments();

    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
    expect(saveSettingsStateMock).toHaveBeenCalledTimes(1);
  });

  test("ignore other user extensions", async () => {
    isLinkedMock.mockResolvedValue(true);

    const extensionPoint = extensionPointDefinitionFactory();
    const brick = {
      ...parsePackage(extensionPoint as any),
      timestamp: new Date(),
    };
    registryFindMock.mockResolvedValue(brick);

    // An extension without a recipe. Exclude _recipe entirely to handle the case where the property is missing
    const extension = extensionFactory({
      extensionPointId: extensionPoint.metadata.id,
    }) as PersistedExtension;
    delete extension._recipe;
    delete extension._deployment;

    await saveOptions({
      extensions: [extension],
    });

    let editorState = initialEditorState;
    const element = (await ADAPTERS.get(
      extensionPoint.definition.type
    ).fromExtension(extension)) as ActionFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addElement(element)
    );
    await saveEditorState(editorState);

    const deployment = deploymentFactory();

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, [deployment]);

    await updateDeployments();

    const { extensions } = await loadOptions();
    expect(extensions).toBeArrayOfSize(2);
    const { elements } = await getEditorState();
    // Expect unrelated dynamic element not to be removed
    expect(elements).toBeArrayOfSize(1);
  });

  test("uninstall existing recipe extension with no dynamic elements", async () => {
    isLinkedMock.mockResolvedValue(true);

    const deployment = deploymentFactory();

    // An extension without a recipe. Exclude _recipe entirely to handle the case where the property is missing
    const extension = extensionFactory({
      _recipe: {
        id: deployment.package.package_id,
        name: deployment.package.name,
        version: validateSemVerString("0.0.1"),
        updated_at: deployment.updated_at as Timestamp,
        sharing: sharingDefinitionFactory(),
      },
    }) as PersistedExtension;
    delete extension._deployment;

    await saveOptions({
      extensions: [extension],
    });

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, [deployment]);

    // Make sure we're testing the case where getEditorState() returns undefined
    expect(await getEditorState()).toBeUndefined();

    await updateDeployments();

    const { extensions } = await loadOptions();
    expect(extensions).toBeArrayOfSize(1);
    expect(extensions[0]._recipe.version).toBe(deployment.package.version);
  });

  test("uninstall existing recipe extension with dynamic element", async () => {
    isLinkedMock.mockResolvedValue(true);

    const deployment = deploymentFactory();

    const extensionPoint = extensionPointDefinitionFactory();
    const brick = {
      ...parsePackage(extensionPoint as any),
      timestamp: new Date(),
    };
    registryFindMock.mockResolvedValue(brick);

    // An extension without a recipe. Exclude _recipe entirely to handle the case where the property is missing
    const extension = extensionFactory({
      extensionPointId: extensionPoint.metadata.id,
      _recipe: {
        id: deployment.package.package_id,
        name: deployment.package.name,
        version: validateSemVerString("0.0.1"),
        updated_at: deployment.updated_at as Timestamp,
        sharing: sharingDefinitionFactory(),
      },
    }) as PersistedExtension;
    delete extension._deployment;

    await saveOptions({
      extensions: [extension],
    });

    let editorState = initialEditorState;
    const element = (await ADAPTERS.get("menuItem").fromExtension(
      extension
    )) as ActionFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addElement(element)
    );
    await saveEditorState(editorState);

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, [deployment]);

    await updateDeployments();

    const { extensions } = await loadOptions();
    expect(extensions).toBeArrayOfSize(1);
    const { elements } = await getEditorState();
    // Expect dynamic element to be removed
    expect(elements).toBeArrayOfSize(0);
    expect(extensions[0]._recipe.version).toBe(deployment.package.version);
  });

  test("opens options page if deployment does not have necessary permissions", async () => {
    isLinkedMock.mockResolvedValue(true);
    jest.mocked(checkDeploymentPermissions).mockResolvedValueOnce({
      hasPermissions: false,
      permissions: emptyPermissionsFactory(),
    });

    const deployment = deploymentFactory();

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, [deployment]);

    await updateDeployments();

    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(0);
    expect(openOptionsPageMock.mock.calls).toHaveLength(1);
  });

  test("skip update and uninstall if not linked", async () => {
    isLinkedMock.mockResolvedValue(false);
    readAuthDataMock.mockResolvedValue({} as any);

    jest.doMock("@/background/deployment", () => ({
      uninstallAllDeployments: jest.fn(),
    }));

    const { uninstallAllDeployments } = await import("@/background/deployment");

    await updateDeployments();

    expect((uninstallAllDeployments as jest.Mock).mock.calls.length).toBe(0);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
    expect(saveSettingsStateMock).toHaveBeenCalledTimes(0);
  });

  test("do not open options page on update if restricted-version flag not set", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, []);

    await updateDeployments();

    expect(isUpdateAvailableMock.mock.calls.length).toBe(1);
    expect(openOptionsPageMock.mock.calls.length).toBe(0);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
  });

  test("open options page if refresh registries fails", async () => {
    refreshRegistriesMock.mockRejectedValue(new Error("test error"));
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(false);

    axiosMock.onGet().reply(200, {
      flags: ["restricted-version"],
    });

    const deployment = deploymentFactory();
    axiosMock.onPost().reply(201, [deployment]);

    await updateDeployments();

    expect(isUpdateAvailableMock.mock.calls.length).toBe(1);
    expect(refreshRegistriesMock.mock.calls.length).toBe(1);
    expect(openOptionsPageMock.mock.calls.length).toBe(1);
  });

  test("open options page on update if restricted-version flag is set", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);

    axiosMock.onGet().reply(200, {
      flags: ["restricted-version"],
    });

    axiosMock.onPost().reply(201, []);

    await updateDeployments();

    expect(isUpdateAvailableMock.mock.calls.length).toBe(1);
    expect(openOptionsPageMock.mock.calls.length).toBe(1);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
  });

  test("open options page on update if enforce_update_millis is set even if snoozed", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);

    getSettingsStateMock.mockResolvedValue({
      nextUpdate: Date.now() + 1_000_000,
      updatePromptTimestamp: null,
    });

    axiosMock.onGet().reply(200, {
      flags: [],
      enforce_update_millis: 5000,
    });

    axiosMock.onPost().reply(201, []);

    await updateDeployments();

    expect(isUpdateAvailableMock.mock.calls.length).toBe(1);
    expect(openOptionsPageMock.mock.calls.length).toBe(1);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
  });

  test("do not open options page if enforce_update_millis is set but no updates available", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(false);

    getSettingsStateMock.mockResolvedValue({
      nextUpdate: Date.now() + 1_000_000,
      updatePromptTimestamp: null,
    });

    axiosMock.onGet().reply(200, {
      flags: [],
      enforce_update_millis: 5000,
    });

    axiosMock.onPost().reply(201, []);

    await updateDeployments();

    expect(isUpdateAvailableMock.mock.calls.length).toBe(1);
    expect(openOptionsPageMock.mock.calls.length).toBe(0);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
  });

  test("skip update if snoozed", async () => {
    isLinkedMock.mockResolvedValue(true);
    isUpdateAvailableMock.mockReturnValue(true);
    getSettingsStateMock.mockResolvedValue({
      nextUpdate: Date.now() + 1_000_000,
    });

    axiosMock.onGet().reply(200, {
      flags: ["restricted-version"],
    });

    axiosMock.onPost().reply(201, []);

    await updateDeployments();

    // Unmatched deployments are always uninstalled if snoozed
    expect(isUpdateAvailableMock.mock.calls.length).toBe(0);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
    expect(openOptionsPageMock.mock.calls.length).toBe(0);
  });

  test("can uninstall all deployments", async () => {
    const personalExtensionPoint = extensionPointDefinitionFactory();
    const personalBrick = {
      ...parsePackage(personalExtensionPoint as any),
      timestamp: new Date(),
    };

    const personalExtension = extensionFactory({
      extensionPointId: personalExtensionPoint.metadata.id,
    }) as PersistedExtension;

    const recipeExtension = extensionFactory({
      _recipe: installedRecipeMetadataFactory(),
    }) as PersistedExtension;

    const deploymentExtensionPoint = extensionPointDefinitionFactory();
    const deploymentsBrick = {
      ...parsePackage(deploymentExtensionPoint as any),
      timestamp: new Date(),
    };

    const deploymentExtension = extensionFactory({
      extensionPointId: deploymentExtensionPoint.metadata.id,
      _deployment: { id: uuidv4(), timestamp: "2021-10-07T12:52:16.189Z" },
      _recipe: installedRecipeMetadataFactory(),
    }) as PersistedExtension;

    registryFindMock.mockImplementation(async (id) => {
      if (id === personalBrick.id) {
        return personalBrick;
      }

      return deploymentsBrick;
    });

    let editorState = initialEditorState;

    const personalElement = (await ADAPTERS.get(
      personalExtensionPoint.definition.type
    ).fromExtension(personalExtension)) as ActionFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addElement(personalElement)
    );

    const deploymentElement = (await ADAPTERS.get(
      deploymentExtensionPoint.definition.type
    ).fromExtension(deploymentExtension)) as ActionFormState;
    editorState = editorSlice.reducer(
      editorState,
      editorSlice.actions.addElement(deploymentElement)
    );

    await saveOptions({
      extensions: [personalExtension, deploymentExtension, recipeExtension],
    });
    await saveEditorState(editorState);

    isLinkedMock.mockResolvedValue(true);
    readAuthDataMock.mockResolvedValue({} as any);

    await updateDeployments();

    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(2);

    const installedIds = extensions.map((x) => x.id);
    expect(installedIds).toContain(personalExtension.id);
    expect(installedIds).toContain(recipeExtension.id);

    const { elements } = await getEditorState();
    expect(elements).toBeArrayOfSize(1);
    expect(elements[0]).toEqual(personalElement);
  });
});
