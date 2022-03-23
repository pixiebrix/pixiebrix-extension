/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import browser from "webextension-polyfill";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import {
  deploymentFactory,
  extensionFactory,
  installedRecipeMetadataFactory,
} from "@/tests/factories";
import { uuidv4 } from "@/types/helpers";
import { PersistedExtension } from "@/core";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { updateDeployments } from "@/background/deployment";

// @ts-expect-error No way to extend `globalThis` effectively
globalThis.browser = browser;

const axiosMock = new MockAdapter(axios);

jest.mock("@/store/settingsStorage", () => ({
  getSettingsState: jest.fn(),
}));

jest.mock("@/hooks/useRefresh", () => ({
  refreshRegistries: jest.fn(),
}));

jest.mock("@/background/util", () => ({
  // eslint-disable-next-line unicorn/no-useless-undefined -- argument is required
  forEachTab: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("webext-messenger");

jest.mock("@/permissions", () => ({
  deploymentPermissions: jest
    .fn()
    .mockResolvedValue({ permissions: [], origins: [] }),
}));

jest.mock("@/telemetry/events", () => ({
  reportEvent: jest.fn(),
}));

jest.mock("@/sidebar/messenger/api", () => {});
jest.mock("@/contentScript/messenger/api", () => ({
  insertButton: jest.fn(),
}));

jest.mock("@/background/messenger/api", () => ({
  traces: {
    // eslint-disable-next-line unicorn/no-useless-undefined -- argument is required
    clear: jest.fn().mockResolvedValue(undefined),
  },
  contextMenus: {
    preload: jest.fn(),
  },
}));

jest.mock("@/background/telemetry", () => ({
  getUID: async () => "UID",
}));

jest.mock("@/auth/token", () => ({
  getExtensionToken: async () => "TESTTOKEN",
  readAuthData: jest.fn().mockResolvedValue({
    organizationId: "00000000-00000000-00000000-00000000",
  }),
  isLinked: jest.fn().mockResolvedValue(true),
  async updateUserData() {},
}));

jest.mock("webext-detect-page", () => ({
  isBackground: () => true,
  isExtensionContext: () => true,
  isDevToolsPage: () => false,
  isContentScript: () => false,
}));

jest.mock("webextension-polyfill", () => {
  const mock = jest.requireActual("webextension-polyfill");

  return {
    __esModule: true,
    default: {
      // Keep the existing local storage mock
      ...mock,
      permissions: {
        contains: jest.fn().mockResolvedValue(true),
      },
      runtime: {
        openOptionsPage: jest.fn(),
        getManifest: jest.fn().mockReturnValue({
          version: "1.5.2",
        }),
      },
    },
  };
});

jest.mock("@/background/installer", () => ({
  isUpdateAvailable: jest.fn().mockReturnValue(false),
}));

import { isLinked, readAuthData } from "@/auth/token";
import { refreshRegistries } from "@/hooks/useRefresh";
import { isUpdateAvailable } from "@/background/installer";
import { getSettingsState } from "@/store/settingsStorage";

const isLinkedMock = isLinked as jest.Mock;
const readAuthDataMock = readAuthData as jest.Mock;
const getManifestMock = browser.runtime.getManifest as jest.Mock;
const openOptionsPageMock = browser.runtime.openOptionsPage as jest.Mock;
const containsPermissionsMock = browser.permissions.contains as jest.Mock;
const refreshRegistriesMock = refreshRegistries as jest.Mock;
const isUpdateAvailableMock = isUpdateAvailable as jest.Mock;
const getSettingsStateMock = getSettingsState as jest.Mock;

beforeEach(() => {
  jest.resetModules();

  isLinkedMock.mockClear();
  readAuthDataMock.mockClear();

  getSettingsStateMock.mockClear();

  getSettingsStateMock.mockResolvedValue({
    nextUpdate: undefined,
  });

  readAuthDataMock.mockResolvedValue({
    organizationId: "00000000-00000000-00000000-00000000",
  });

  getManifestMock.mockClear();
  containsPermissionsMock.mockClear();
  refreshRegistriesMock.mockClear();
  openOptionsPageMock.mockClear();
  isUpdateAvailableMock.mockClear();
});

describe("updateDeployments", () => {
  test("can add deployment from empty state if deployment has permissions", async () => {
    isLinkedMock.mockResolvedValue(true);
    containsPermissionsMock.mockResolvedValue(true);

    const deployment = deploymentFactory();

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(201, [deployment]);

    await updateDeployments();

    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
  });

  test("opens options page if deployment does not have necessary permissions", async () => {
    isLinkedMock.mockResolvedValue(true);
    containsPermissionsMock.mockResolvedValue(false);

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

    // eslint-disable-next-line import/dynamic-import-chunkname -- test code
    const { uninstallAllDeployments } = await import("@/background/deployment");

    await updateDeployments();

    expect((uninstallAllDeployments as jest.Mock).mock.calls.length).toBe(0);
    expect(refreshRegistriesMock.mock.calls.length).toBe(0);
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
    const personalExtension = extensionFactory() as PersistedExtension;

    const recipeExtension = extensionFactory({
      _recipe: installedRecipeMetadataFactory(),
    }) as PersistedExtension;

    const deploymentExtension = extensionFactory({
      _deployment: { id: uuidv4(), timestamp: "2021-10-07T12:52:16.189Z" },
      _recipe: installedRecipeMetadataFactory(),
    }) as PersistedExtension;

    await saveOptions({
      extensions: [personalExtension, deploymentExtension, recipeExtension],
    });

    isLinkedMock.mockResolvedValue(true);
    readAuthDataMock.mockResolvedValue({} as any);

    await updateDeployments();

    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(2);

    const installedIds = extensions.map((x) => x.id);
    expect(installedIds).toContain(personalExtension.id);
    expect(installedIds).toContain(recipeExtension.id);
  });
});
