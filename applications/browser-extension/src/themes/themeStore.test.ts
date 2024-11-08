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

import { saveSettingsState } from "../store/settings/settingsStorage";
import { initialSettingsState } from "../store/settings/settingsSlice";
import {
  INTERNAL_reset,
  readManagedStorage,
} from "../store/enterprise/managedStorage";
import { getActiveTheme } from "./themeStore";
import { type AxiosError } from "axios";
import reportError from "../telemetry/reportError";
import { uuidSequence } from "../testUtils/factories/stringFactories";
import { mockAuthenticatedMeApiResponse } from "../testUtils/userMock";
import {
  meWithPartnerApiResponseFactory,
  meOrganizationApiResponseFactory,
} from "../testUtils/factories/authFactories";
import { appApiMock } from "../testUtils/appApiMock";
import { API_PATHS } from "../data/service/urlPaths";

const reportErrorMock = jest.mocked(reportError);

describe("getActiveTheme", () => {
  const expectedManagedOrganizationId = uuidSequence(1);

  beforeEach(() => {
    appApiMock.reset();
  });

  describe("managed storage is set", () => {
    beforeEach(async () => {
      appApiMock
        .onGet(API_PATHS.ORGANIZATION_THEME(expectedManagedOrganizationId))
        .reply(200, {
          show_sidebar_logo: true,
          logo: "some_managed_logo.svg",
          toolbar_icon: "some_managed_icon.svg",
        });

      await mockAuthenticatedMeApiResponse();

      await browser.storage.managed.set({
        partnerId: "automation-anywhere",
        managedOrganizationId: expectedManagedOrganizationId,
      });

      // XXX: waiting for managed storage initialization seems to be necessary to avoid test interference when
      // run with other tests. We needed to add it after some seemingly unrelated changes:
      // See test suite changes in : https://github.com/pixiebrix/pixiebrix-extension/pull/6134/
      await readManagedStorage();

      // `initialSettingsState` partnerId is by default null
      await saveSettingsState(initialSettingsState);
    });

    afterEach(async () => {
      await INTERNAL_reset();
      await browser.storage.managed.clear();
      await browser.storage.local.clear();
    });

    it("prefers managed storage", async () => {
      await expect(getActiveTheme()).resolves.toStrictEqual({
        themeName: "automation-anywhere",
        toolbarIcon: "some_managed_icon.svg",
        customSidebarLogo: "some_managed_logo.svg",
        lastFetched: expect.any(Number),
        logo: {
          regular: "test-file-stub",
          small: "test-file-stub",
        },
        showSidebarLogo: true,
      });
    });
  });

  describe("the user has a primary organization defined and managed storage not present", () => {
    beforeEach(async () => {
      await mockAuthenticatedMeApiResponse(
        meWithPartnerApiResponseFactory({
          organization: meOrganizationApiResponseFactory({
            theme: {
              show_sidebar_logo: true,
              logo: "myPrimaryOrglogo.svg",
              toolbar_icon: "myPrimaryOrgIcon.svg",
            },
          }),
        }),
      );

      // `initialSettingsState` partnerId is by default null
      await saveSettingsState(initialSettingsState);
    });

    it("prefers users primary org and partner", async () => {
      await expect(getActiveTheme()).resolves.toStrictEqual({
        themeName: "automation-anywhere",
        customSidebarLogo: "myPrimaryOrglogo.svg",
        toolbarIcon: "myPrimaryOrgIcon.svg",
        lastFetched: expect.any(Number),
        logo: {
          regular: "test-file-stub",
          small: "test-file-stub",
        },
        showSidebarLogo: true,
      });
    });
  });

  describe("local settings defines a partner value; managed storage and user org/partner not present", () => {
    beforeEach(async () => {
      await mockAuthenticatedMeApiResponse();

      // `initialSettingsState` partnerId is by default null
      await saveSettingsState({
        ...initialSettingsState,
        partnerId: "automation-anywhere",
      });
    });

    it("prefers the local settings state last", async () => {
      await expect(getActiveTheme()).resolves.toStrictEqual({
        themeName: "automation-anywhere",
        customSidebarLogo: null,
        toolbarIcon: null,
        lastFetched: expect.any(Number),
        logo: {
          regular: "test-file-stub",
          small: "test-file-stub",
        },
        showSidebarLogo: true,
      });
    });
  });

  describe("no other theme data sources are present", () => {
    beforeEach(async () => {
      await mockAuthenticatedMeApiResponse();

      // `initialSettingsState` partnerId is by default null
      await saveSettingsState(initialSettingsState);
    });

    it("uses default theme", async () => {
      await expect(getActiveTheme()).resolves.toStrictEqual({
        themeName: "default",
        customSidebarLogo: null,
        toolbarIcon: null,
        lastFetched: expect.any(Number),
        logo: {
          regular: "test-file-stub",
          small: "test-file-stub",
        },
        showSidebarLogo: true,
      });
    });
  });

  describe("an error is thrown", () => {
    beforeEach(async () => {
      appApiMock.onAny().reply(500);

      // `initialSettingsState` partnerId is by default null
      await saveSettingsState(initialSettingsState);
    });

    it("uses default theme and reports the error", async () => {
      await expect(getActiveTheme()).resolves.toStrictEqual({
        themeName: "default",
        customSidebarLogo: null,
        toolbarIcon: null,
        lastFetched: null,
        logo: {
          regular: "test-file-stub",
          small: "test-file-stub",
        },
        showSidebarLogo: true,
      });
      expect(reportErrorMock).toHaveBeenCalledOnce();
      expect((reportErrorMock.mock.calls[0]![0] as AxiosError).message).toBe(
        "Request failed with status code 500",
      );
    });
  });
});
