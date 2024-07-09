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
  requirePartnerAuth,
  openInstallPage,
  showInstallPage,
  getAvailableVersion,
  setAvailableVersion,
} from "@/background/installer";
import * as auth from "@/auth/authStorage";
import { integrationConfigLocator } from "@/background/integrationConfigLocator";
import { uuidv4 } from "@/types/helpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { INTERNAL_reset as resetManagedStorage } from "@/store/enterprise/managedStorage";
import { userPartnerFactory } from "@/testUtils/factories/authFactories";

const APP_BASE_URL = "https://app.pixiebrix.com";

jest.mock("@/data/service/baseService", () => ({
  // Can't use APP_BASE_URL because it's not defined yet when Jest defines the mock
  getBaseURL: jest.fn().mockResolvedValue("https://app.pixiebrix.com"),
}));

jest.mock("@/auth/authStorage", () => ({
  isLinked: jest.fn().mockResolvedValue(false),
  getExtensionToken: jest.fn().mockResolvedValue(null),
  getUserData: jest.fn().mockResolvedValue(null),
  addListener: jest.fn(),
}));

jest.mock("@/background/telemetry");

jest.mock("@/background/integrationConfigLocator", () => ({
  integrationConfigLocator: {
    findAllSanitizedConfigsForIntegration: jest.fn().mockResolvedValue([]),
  },
}));

const createTabMock = jest.mocked(browser.tabs.create);
const updateTabMock = jest.mocked(browser.tabs.update);
const queryTabsMock = jest.mocked(browser.tabs.query);
const isLinkedMock = jest.mocked(auth.isLinked);
const getExtensionTokenMock = jest.mocked(auth.getExtensionToken);
const getUserData = jest.mocked(auth.getUserData);
const findAllSanitizedConfigsForIntegrationMock = jest.mocked(
  integrationConfigLocator.findAllSanitizedConfigsForIntegration,
);
const browserManagedStorageMock = jest.mocked(browser.storage.managed.get);

beforeEach(async () => {
  jest.clearAllMocks();
  await resetManagedStorage();
});

describe("openInstallPage", () => {
  it("Redirects Admin Console tab for native PixieBrix setup flow", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: `${APP_BASE_URL}/setup`,
      },
    ] as any);
    await openInstallPage();
    expect(updateTabMock).toHaveBeenCalledWith(1, {
      url: APP_BASE_URL,
      active: true,
    });
    expect(createTabMock).not.toHaveBeenCalled();
  });

  it("Opens Extension Console in same tab for enterprise partner", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: `${APP_BASE_URL}/start?hostname=enterprise.com`,
      },
    ] as any);
    await openInstallPage();
    expect(updateTabMock).toHaveBeenCalledWith(1, {
      url: "chrome-extension://abcxyz/options.html#/start?hostname=enterprise.com",
      active: true,
    });
    expect(createTabMock).not.toHaveBeenCalled();
  });

  it("Opens Admin Console in same tab for community partner", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: `${APP_BASE_URL}/start?hostname=community2.cloud-2.automationanywhere.digital`,
      },
    ] as any);
    await openInstallPage();
    expect(updateTabMock).toHaveBeenCalledWith(1, {
      url: APP_BASE_URL,
      active: true,
    });
    expect(createTabMock).not.toHaveBeenCalled();
  });

  it("Opens new Extension Console tab if no Admin Console onboarding tab found", async () => {
    queryTabsMock.mockResolvedValue([]);
    await openInstallPage();
    expect(createTabMock).toHaveBeenCalledWith({ url: APP_BASE_URL });
    expect(updateTabMock).not.toHaveBeenCalled();
  });
});

describe("checkPartnerAuth", () => {
  it("skips if not linked", async () => {
    isLinkedMock.mockResolvedValue(false);

    await requirePartnerAuth();

    expect(createTabMock.mock.calls).toHaveLength(0);
    expect(updateTabMock.mock.calls).toHaveLength(0);
  });

  it("skip if no partner", async () => {
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    getUserData.mockResolvedValue({
      partner: null,
    });

    await requirePartnerAuth();

    expect(createTabMock).not.toHaveBeenCalled();
    expect(updateTabMock).not.toHaveBeenCalled();
  });

  it("skip if partner JWT install", async () => {
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockReset();
    getUserData.mockResolvedValue({
      partner: userPartnerFactory(),
    });

    await requirePartnerAuth();

    expect(createTabMock).not.toHaveBeenCalled();
    expect(updateTabMock).not.toHaveBeenCalled();
  });

  it("opens extension console if linked with partner and no services", async () => {
    queryTabsMock.mockResolvedValue([]);
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    findAllSanitizedConfigsForIntegrationMock.mockResolvedValue([
      // Include a cloud configuration to clarify that local integration is still required
      { id: uuidv4(), serviceId: "automation-anywhere", proxy: true } as any,
    ]);
    getUserData.mockResolvedValue({
      partner: userPartnerFactory(),
    });

    await requirePartnerAuth();

    expect(createTabMock).toHaveBeenCalledTimes(1);
    expect(createTabMock).toHaveBeenCalledWith({
      url: "chrome-extension://abcxyz/options.html",
    });
    expect(updateTabMock).not.toHaveBeenCalled();
  });

  it("opens extension console in same tab if linked with partner and no services and extension console open", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: APP_BASE_URL,
      },
    ] as any);
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    getUserData.mockResolvedValue({
      partner: userPartnerFactory(),
    });

    await requirePartnerAuth();

    expect(createTabMock).not.toHaveBeenCalled();
    expect(updateTabMock).toHaveBeenCalledTimes(1);
    expect(updateTabMock).toHaveBeenCalledWith(1, {
      url: "chrome-extension://abcxyz/options.html",
      active: true,
    });
  });

  it("does not open extension console if integration is configured", async () => {
    queryTabsMock.mockResolvedValue([]);
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    findAllSanitizedConfigsForIntegrationMock.mockResolvedValue([
      { id: uuidv4(), serviceId: "automation-anywhere" } as any,
    ]);
    getUserData.mockResolvedValue({
      partner: userPartnerFactory(),
    });

    await requirePartnerAuth();

    expect(createTabMock).not.toHaveBeenCalled();
    expect(updateTabMock).not.toHaveBeenCalled();
  });
});

describe("handleInstall", () => {
  test("it opens extension console if not linked on CWS install", async () => {
    // App setup tab isn't open
    queryTabsMock.mockResolvedValue([]);
    isLinkedMock.mockResolvedValue(false);
    await showInstallPage({
      reason: "install",
      previousVersion: undefined,
      temporary: false,
    });
    await waitForEffect();
    expect(createTabMock).toHaveBeenCalledWith({ url: APP_BASE_URL });
  });

  test("don't open tab on install if linked", async () => {
    // App setup tab isn't open
    queryTabsMock.mockResolvedValue([]);
    isLinkedMock.mockResolvedValue(true);
    await showInstallPage({
      reason: "install",
      previousVersion: undefined,
      temporary: false,
    });
    expect(createTabMock).not.toHaveBeenCalled();
  });

  test.each([undefined, "https://sso.com"])(
    "don't open tab on install if disableLoginTab is set and ssoUrl is %s",
    async (ssoUrl) => {
      browserManagedStorageMock.mockResolvedValue({
        disableLoginTab: true,
        ssoUrl,
      });
      queryTabsMock.mockResolvedValue([]);
      isLinkedMock.mockResolvedValue(false);
      await showInstallPage({
        reason: "install",
        previousVersion: undefined,
        temporary: false,
      });
      expect(createTabMock).not.toHaveBeenCalled();
    },
  );
});

describe("getAvailableVersion", () => {
  test("returns the set version", () => {
    setAvailableVersion({ version: "1.2.3" });

    expect(getAvailableVersion()).toBe("1.2.3");
  });

  test("returns the version coerced to a semver string", () => {
    setAvailableVersion({ version: "1.2.3.4000" });

    expect(getAvailableVersion()).toBe("1.2.3");
  });

  test("returns null if no version set", () => {
    // Override type to allow for testing null _availableVersion
    setAvailableVersion({ version: null as unknown as string });

    expect(getAvailableVersion()).toBeNull();
  });
});
