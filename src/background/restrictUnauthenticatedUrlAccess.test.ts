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

import initRestrictUnauthenticatedUrlAccess from "@/background/restrictUnauthenticatedUrlAccess";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { uuidv4 } from "@/types/helpers";
import { INTERNAL_reset } from "@/store/enterprise/managedStorage";
import reportError from "@/telemetry/reportError";
import {
  isLinked,
  TEST_clearListeners,
  TEST_triggerListeners,
} from "@/auth/token";
import { waitForEffect } from "@/testUtils/testHelpers";
import { tabFactory } from "@/testUtils/factories/browserFactories";

jest.mock("@/auth/token", () => ({
  __esModule: true,
  ...jest.requireActual("@/auth/token"),
  isLinked: jest.fn(),
}));

jest.mock("@/utils/extensionUtils", () => ({
  forEachTab: jest.fn(),
}));

const axiosMock = new MockAdapter(axios);
const reportErrorMock = jest.mocked(reportError);
const isLinkedMock = jest.mocked(isLinked);

const expectedManageOrganizationId = uuidv4();
const expectedAuthUrlPatterns = [
  { url_pattern: "https://foo.com/*" },
  { url_pattern: "https://bar.com/*" },
  { url_pattern: "https://baz.com/*" },
];

const addListenerSpy = jest.spyOn(browser.tabs.onUpdated, "addListener");
const removeListenerSpy = jest.spyOn(browser.tabs.onUpdated, "removeListener");
const updateTabSpy = jest.spyOn(browser.tabs, "update");

// `jest-webextension-mock` is missing mocks for onRemoved: https://github.com/clarkbw/jest-webextension-mock/pull/180
(browser.tabs.onRemoved as any) = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

describe("enforceAuthentication", () => {
  beforeEach(async () => {
    axiosMock
      .onGet(
        `/api/organizations/${expectedManageOrganizationId}/auth-url-patterns/`,
      )
      .reply(200, expectedAuthUrlPatterns);
  });

  afterEach(async () => {
    // eslint-disable-next-line new-cap -- used for testing
    INTERNAL_reset();
    await browser.storage.managed.clear();
    await browser.storage.local.clear();
    axiosMock.reset();
    jest.clearAllMocks();
    // eslint-disable-next-line new-cap -- used for testing
    TEST_clearListeners();
  });

  it("does nothing if managed storage values are not configured", async () => {
    await initRestrictUnauthenticatedUrlAccess();
    expect(axiosMock.history.get).toHaveLength(0);
  });

  it("fetches managed organization data if enforceAuthentication and managedOrganizationId are configured", async () => {
    await browser.storage.managed.set({
      managedOrganizationId: expectedManageOrganizationId,
      enforceAuthentication: true,
    });

    isLinkedMock.mockResolvedValue(false);

    await initRestrictUnauthenticatedUrlAccess();
    expect(axiosMock.history.get).toHaveLength(1);
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
  });

  it("does not add event listener if network request fails", async () => {
    axiosMock
      .onGet(
        `/api/organizations/${expectedManageOrganizationId}/auth-url-patterns/`,
      )
      .reply(500);

    await browser.storage.managed.set({
      managedOrganizationId: expectedManageOrganizationId,
      enforceAuthentication: true,
    });

    await initRestrictUnauthenticatedUrlAccess();
    expect(axiosMock.history.get).toHaveLength(1);
    expect(addListenerSpy).toHaveBeenCalledTimes(0);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
  });

  it("adds and remove tabs.onUpdated listener if auth listeners are triggered with and without auth respectively", async () => {
    await browser.storage.managed.set({
      managedOrganizationId: expectedManageOrganizationId,
      enforceAuthentication: true,
    });

    isLinkedMock.mockResolvedValue(false);

    await initRestrictUnauthenticatedUrlAccess();
    expect(axiosMock.history.get).toHaveLength(1);
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledTimes(0);

    // eslint-disable-next-line new-cap -- used for testing
    TEST_triggerListeners({ token: "foo" });

    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    addListenerSpy.mockClear();

    // eslint-disable-next-line new-cap -- used for testing
    TEST_triggerListeners(undefined);
    await waitForEffect();
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
  });

  it("open latest restricted URL on authentication", async () => {
    await browser.storage.managed.set({
      managedOrganizationId: expectedManageOrganizationId,
      enforceAuthentication: true,
    });

    // Pretend there's not app tabs open, so create a new tab on authentication
    jest.mocked(browser.tabs.query).mockResolvedValue([]);

    isLinkedMock.mockResolvedValue(false);

    await initRestrictUnauthenticatedUrlAccess();

    const blockedNavigation = {
      tabId: 1,
      url: "https://foo.com",
    };

    // We're using a mock, not a fake which doesn't implement onUpdated events, so we can't use that to simulate
    // the user visiting a page. Instead, just set the storage directly
    await browser.storage.local.set({
      lastRestrictedNavigation: blockedNavigation,
    });

    // Sanity check to ensure browser.storage fake is working
    await expect(
      browser.storage.local.get("lastRestrictedNavigation"),
    ).resolves.toEqual({
      lastRestrictedNavigation: blockedNavigation,
    });

    jest.mocked(browser.tabs.get).mockResolvedValue(
      tabFactory({
        id: blockedNavigation.tabId,
        url: blockedNavigation.url,
      }),
    );

    // eslint-disable-next-line new-cap -- used for testing
    TEST_triggerListeners({ token: "foo" });

    await waitForEffect();

    expect(updateTabSpy).toHaveBeenCalledExactlyOnceWith(
      blockedNavigation.tabId,
      {
        url: blockedNavigation.url,
        active: true,
      },
    );

    await expect(
      browser.storage.local.get("lastRestrictedNavigation"),
    ).resolves.toEqual({});
  });

  it("handles restricted tab no longer exists on login", async () => {
    await browser.storage.managed.set({
      managedOrganizationId: expectedManageOrganizationId,
      enforceAuthentication: true,
    });

    // Pretend there's not app tabs open, so create a new tab on authentication
    jest.mocked(browser.tabs.query).mockResolvedValue([]);

    isLinkedMock.mockResolvedValue(false);

    await initRestrictUnauthenticatedUrlAccess();

    const blockedNavigation = {
      tabId: 1,
      url: "https://foo.com",
    };

    // We're using a mock, not a fake which doesn't implement onUpdated events, so we can't use that to simulate
    // the user visiting a page. Instead, just set the storage directly
    await browser.storage.local.set({
      lastRestrictedNavigation: blockedNavigation,
    });

    // Mock that tab no longer exists
    jest.mocked(browser.tabs.get).mockResolvedValue(null);

    // eslint-disable-next-line new-cap -- used for testing
    TEST_triggerListeners({ token: "foo" });

    await waitForEffect();

    expect(updateTabSpy).not.toHaveBeenCalled();

    await expect(
      browser.storage.local.get("lastRestrictedNavigation"),
    ).resolves.toEqual({});
  });
});
