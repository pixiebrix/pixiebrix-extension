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

import { checkPartnerAuth, openInstallPage } from "@/background/installer";
import * as auth from "@/auth/token";
import { locator } from "@/background/locator";
import { uuidv4 } from "@/types/helpers";

const APP_BASE_URL = "https://app.pixiebrix.com";

jest.mock("@/services/baseService", () => ({
  // Can't use APP_BASE_URL because it's not defined yet when Jest defines the mock
  getBaseURL: jest.fn().mockResolvedValue("https://app.pixiebrix.com"),
}));

jest.mock("@/auth/token", () => ({
  isLinked: jest.fn().mockResolvedValue(false),
  getExtensionToken: jest.fn().mockResolvedValue(null),
  getUserData: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/background/locator", () => ({
  locator: {
    locateAllForService: jest.fn().mockResolvedValue([]),
  },
}));

const createTabMock = browser.tabs.create as jest.Mock;
const updateTabMock = browser.tabs.update as jest.Mock;
const queryTabsMock = browser.tabs.query as jest.Mock;
const getExtensionUrlMock = browser.runtime.getURL as jest.Mock;
const isLinkedMock = auth.isLinked as jest.Mock;
const getExtensionTokenMock = auth.getExtensionToken as jest.Mock;
const getUserData = auth.getUserData as jest.Mock;
const locateAllForServiceMock = locator.locateAllForService as jest.Mock;

beforeEach(() => {
  getExtensionUrlMock.mockImplementation(
    (resource: string) => `chrome-extension://abc123/${resource}`
  );
  jest.clearAllMocks();
});

describe("openInstallPage", () => {
  it("Redirects Admin Console tab for native PixieBrix setup flow", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: `${APP_BASE_URL}/setup`,
      },
    ]);
    await openInstallPage();
    expect(updateTabMock).toHaveBeenCalledWith(1, { url: APP_BASE_URL });
    expect(createTabMock.mock.calls.length).toBe(0);
  });

  it("Opens Extension Console in same tab for enterprise partner", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: `${APP_BASE_URL}/start?hostname=enterprise.com`,
      },
    ]);
    await openInstallPage();
    expect(updateTabMock).toHaveBeenCalledWith(1, {
      url: "chrome-extension://abc123/options.html#/start?hostname=enterprise.com",
      active: true,
    });
    expect(createTabMock.mock.calls.length).toBe(0);
  });

  it("Opens Admin Console in same tab for community partner", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: `${APP_BASE_URL}/start?hostname=community2.cloud-2.automationanywhere.digital`,
      },
    ]);
    await openInstallPage();
    expect(updateTabMock).toHaveBeenCalledWith(1, { url: APP_BASE_URL });
    expect(createTabMock.mock.calls.length).toBe(0);
  });

  it("Opens new Extension Console tab if no Admin Console onboarding tab found", async () => {
    queryTabsMock.mockResolvedValue([]);
    await openInstallPage();
    expect(createTabMock).toHaveBeenCalledWith({ url: APP_BASE_URL });
    expect(updateTabMock.mock.calls.length).toBe(0);
  });
});

describe("checkPartnerAuth", () => {
  it("skips if not linked", async () => {
    isLinkedMock.mockResolvedValue(false);

    await checkPartnerAuth();

    expect(createTabMock.mock.calls.length).toBe(0);
    expect(updateTabMock.mock.calls.length).toBe(0);
  });

  it("skip if no partner", async () => {
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    getUserData.mockResolvedValue({
      partner: null,
    });

    await checkPartnerAuth();

    expect(createTabMock.mock.calls.length).toBe(0);
    expect(updateTabMock.mock.calls.length).toBe(0);
  });

  it("skip if partner JWT install", async () => {
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue(null);
    getUserData.mockResolvedValue({
      partner: {
        id: uuidv4(),
        theme: "automation-anywhere",
      },
    });

    await checkPartnerAuth();

    expect(createTabMock.mock.calls.length).toBe(0);
    expect(updateTabMock.mock.calls.length).toBe(0);
  });

  it("opens extension console if linked with partner and no services", async () => {
    queryTabsMock.mockResolvedValue([]);
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    locateAllForServiceMock.mockResolvedValue([
      // Include a cloud configuration to clarify that local integration is still required
      { id: uuidv4(), serviceId: "automation-anywhere", proxy: true },
    ]);
    getUserData.mockResolvedValue({
      partner: {
        id: uuidv4(),
        theme: "automation-anywhere",
      },
    });

    await checkPartnerAuth();

    expect(createTabMock.mock.calls.length).toBe(1);
    expect(createTabMock).toHaveBeenCalledWith({
      url: "chrome-extension://abc123/options.html",
    });
    expect(updateTabMock.mock.calls.length).toBe(0);
  });

  it("opens extension console in same tab if linked with partner and no services and extension console open", async () => {
    queryTabsMock.mockResolvedValue([
      {
        id: 1,
        url: APP_BASE_URL,
      },
    ]);
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    getUserData.mockResolvedValue({
      partner: {
        id: uuidv4(),
        theme: "automation-anywhere",
      },
    });

    await checkPartnerAuth();

    expect(createTabMock.mock.calls.length).toBe(0);
    expect(updateTabMock.mock.calls.length).toBe(1);
    expect(updateTabMock).toHaveBeenCalledWith(1, {
      url: "chrome-extension://abc123/options.html",
      active: true,
    });
  });

  it("does not open extension console if integration is configured", async () => {
    queryTabsMock.mockResolvedValue([]);
    isLinkedMock.mockResolvedValue(true);
    getExtensionTokenMock.mockResolvedValue("abc123");
    locateAllForServiceMock.mockResolvedValue([
      { id: uuidv4(), serviceId: "automation-anywhere" },
    ]);
    getUserData.mockResolvedValue({
      partner: {
        id: uuidv4(),
        theme: "automation-anywhere",
      },
    });

    await checkPartnerAuth();

    expect(createTabMock.mock.calls.length).toBe(0);
    expect(updateTabMock.mock.calls.length).toBe(0);
  });
});
