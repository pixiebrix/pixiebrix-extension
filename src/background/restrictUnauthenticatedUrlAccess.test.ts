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
import { isLinked } from "@/auth/token";
import { INTERNAL_reset } from "@/store/enterprise/managedStorage";

const axiosMock = new MockAdapter(axios);
const isLinkedMock = jest.mocked(isLinked);

jest.mock("@/auth/token", () => ({
  isLinked: jest.fn(),
}));

const expectedManageOrganizationId = uuidv4();
const expectedAuthUrlPatterns = [
  "https://foo.com/*",
  "https://bar.com/*",
  "https://baz.com/*",
];

const addListenerSpy = jest.spyOn(browser.tabs.onUpdated, "addListener");

describe("enforceAuthentication", () => {
  beforeEach(async () => {
    axiosMock
      .onGet(`/api/organizations/${expectedManageOrganizationId}/managed-data/`)
      .reply(200, {
        auth_url_patterns: expectedAuthUrlPatterns,
      });
  });

  afterEach(async () => {
    INTERNAL_reset();
    await browser.storage.managed.clear();
    axiosMock.reset();
    isLinkedMock.mockClear();
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

    // isLinkedMock.mockResolvedValue(false);

    await initRestrictUnauthenticatedUrlAccess();
    expect(axiosMock.history.get).toHaveLength(1);
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
  });
});
