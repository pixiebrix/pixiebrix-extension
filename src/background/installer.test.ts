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

import { openInstallPage } from "@/background/installer";

const APP_BASE_URL = "https://app.pixiebrix.com";

jest.mock("@/services/baseService", () => ({
  getBaseURL: jest.fn().mockResolvedValue("https://app.pixiebrix.com"),
}));

const createTabMock = browser.tabs.create as jest.Mock;
const updateTabMock = browser.tabs.update as jest.Mock;
const queryTabsMock = browser.tabs.query as jest.Mock;
const getExtensionUrlMock = browser.runtime.getURL as jest.Mock;

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
