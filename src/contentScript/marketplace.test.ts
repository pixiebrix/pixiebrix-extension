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

import {
  hideActivateRecipeInSidebar,
  showActivateRecipeInSidebar,
} from "@/contentScript/sidebarController";
import { getAuthHeaders } from "@/auth/token";
import { initMarketplaceEnhancements } from "@/contentScript/marketplace";
import { loadOptions } from "@/store/extensionsStorage";
import { JSDOM } from "jsdom";

jest.mock("@/contentScript/sidebarController", () => ({
  ensureSidebar: jest.fn(),
  showActivateRecipeInSidebar: jest.fn(),
  hideActivateRecipeInSidebar: jest.fn(),
}));

const showFunctionMock = showActivateRecipeInSidebar as jest.MockedFunction<
  typeof showActivateRecipeInSidebar
>;
const hideFunctionMock = hideActivateRecipeInSidebar as jest.MockedFunction<
  typeof hideActivateRecipeInSidebar
>;

jest.mock("@/auth/token", () => ({
  getAuthHeaders: jest.fn(),
}));

const getAuthHeadersMock = getAuthHeaders as jest.MockedFunction<
  typeof getAuthHeaders
>;

jest.mock("@/store/extensionsStorage", () => ({
  loadOptions: jest.fn(),
}));

const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

// For window focus, check testing library user-event
// or possible window.dispatch. JQuery also possibly.

describe("marketplace enhancements", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // delete window.location;
    // window.location = new URL("https://www.pixiebrix.com/marketplace");
  });

  test("should not run if not on marketplace", async () => {
    const dom = new JSDOM();
    dom.reconfigure({ url: "https://www.google.com" });
    location.href = "https://www.google.com";
    await initMarketplaceEnhancements();
    expect(getAuthHeadersMock).not.toHaveBeenCalled();
    expect(loadOptionsMock).not.toHaveBeenCalled();
  });

  test("should not run if not logged in", async () => {
    getAuthHeadersMock.mockResolvedValue(null);
    window.location.href = "https://www.pixiebrix.com/marketplace";
    await initMarketplaceEnhancements();
    expect(getAuthHeadersMock).toHaveBeenCalled();
    expect(loadOptionsMock).not.toHaveBeenCalled();
  });
});
