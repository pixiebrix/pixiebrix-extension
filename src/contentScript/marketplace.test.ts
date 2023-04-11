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

import { showActivateRecipeInSidebar } from "@/contentScript/sidebarController";
import { getAuthHeaders } from "@/auth/token";
import {
  initMarketplaceEnhancements,
  unloadMarketplaceEnhancements,
} from "@/contentScript/marketplace";
import { loadOptions } from "@/store/extensionsStorage";
import { getDocument } from "@/extensionPoints/extensionPointTestUtils";
import { validateRegistryId } from "@/types/helpers";
import {
  extensionFactory,
  installedRecipeMetadataFactory,
} from "@/testUtils/factories";
import { type PersistedExtension } from "@/types/extensionTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import { MARKETPLACE_URL } from "@/utils/strings";
import { getActivatingBlueprint } from "@/background/messenger/external/_implementation";

jest.mock("@/contentScript/sidebarController", () => ({
  ensureSidebar: jest.fn(),
  showActivateRecipeInSidebar: jest.fn(),
  hideActivateRecipeInSidebar: jest.fn(),
}));

const showFunctionMock = showActivateRecipeInSidebar as jest.MockedFunction<
  typeof showActivateRecipeInSidebar
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

jest.mock("@/background/messenger/external/_implementation", () => ({
  setActivatingBlueprint: jest.fn(),
  getActivatingBlueprint: jest.fn(),
}));

const getActivatingBlueprintMock =
  getActivatingBlueprint as jest.MockedFunction<typeof getActivatingBlueprint>;

const recipeId1 = validateRegistryId("@pixies/misc/comment-and-vote");
const recipeId2 = validateRegistryId("@pixies/github/github-notifications");

const activateButtonsHtml = `
<div>
    <a class="btn btn-primary" href="https://app.pixiebrix.com/activate?id=${encodeURIComponent(
      recipeId1
    )}&utm_source=marketplace&utm_campaign=activate_blueprint" target="_blank" rel="noreferrer noopener"><i class="fas fa-plus-circle"></i> Activate</a>
    <a class="btn btn-primary" href="https://app.pixiebrix.com/activate?id=${encodeURIComponent(
      recipeId2
    )}&utm_source=marketplace&utm_campaign=activate_blueprint" target="_blank" rel="noreferrer noopener"><i class="fas fa-plus-circle"></i> Activate</a>
</div>
`;

describe("marketplace enhancements", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.innerHTML = getDocument(activateButtonsHtml).body.innerHTML;
  });

  afterEach(() => {
    jest.resetAllMocks();
    unloadMarketplaceEnhancements();
  });

  test("given a non-marketplace page, when loaded, then don't run enhancements", async () => {
    window.location.assign("https://www.google.com/");

    await initMarketplaceEnhancements();

    // The checks for auth state and installed recipes should not be called
    expect(getAuthHeadersMock).not.toHaveBeenCalled();
    expect(loadOptionsMock).not.toHaveBeenCalled();
    // TODO: the in progress recipe activation also should not be called
  });

  test("given user is not logged in, when activation button clicked, then open admin console", async () => {
    getAuthHeadersMock.mockResolvedValue(null);
    window.location.assign(MARKETPLACE_URL);

    await initMarketplaceEnhancements();

    // Click an activate button
    const activateButtons = document.querySelectorAll("a");
    activateButtons[0].click();
    await waitForEffect();

    // User is not logged in, so current page should navigate away from marketplace
    // @ts-expect-error -- some typing weirdness with jest-location-mock
    expect(window.location).not.toBeAt(MARKETPLACE_URL);
  });

  test("given user is not logged in, when loaded, then don't resume activation in progress", async () => {
    getAuthHeadersMock.mockResolvedValue(null);
    window.location.assign(MARKETPLACE_URL);

    await initMarketplaceEnhancements();

    // The loadPageEnhancements function calls getInstalledRecipeIds,
    // which calls isUserLoggedIn, which calls getAuthHeaders. Then
    // there is another login check before loading the in progress
    // recipe activation.
    expect(getAuthHeadersMock).toHaveBeenCalledTimes(2);
    // The getInstalledRecipeIds function should not call loadOptions
    // when the user is not logged in
    expect(loadOptionsMock).not.toHaveBeenCalled();
    // The marketplace script should not resume in-progress blueprint
    // activation when the user is not logged in
    expect(getActivatingBlueprintMock).not.toHaveBeenCalled();
  });

  test("given user is not logged in, when loaded, should not change button text", async () => {
    getAuthHeadersMock.mockResolvedValue(null);
    window.location.assign(MARKETPLACE_URL);
    // Recipe 1 is installed, recipe 2 is not
    const extension1 = extensionFactory({
      _recipe: installedRecipeMetadataFactory({
        id: recipeId1,
      }),
    }) as PersistedExtension;
    const extension2 = extensionFactory() as PersistedExtension;
    loadOptionsMock.mockResolvedValue({
      extensions: [extension1, extension2],
    });

    await initMarketplaceEnhancements();

    const activateButtons = document.querySelectorAll("a");
    // Text content starts with a space because of the icon
    expect(activateButtons[0].textContent).toBe(" Activate");
    expect(activateButtons[1].textContent).toBe(" Activate");
  });

  test("given user is logged in, when loaded, should change button text for installed recipe", async () => {
    getAuthHeadersMock.mockResolvedValue({ foo: "bar" });
    window.location.assign(MARKETPLACE_URL);
    // Recipe 1 is installed, recipe 2 is not
    const extension1 = extensionFactory({
      _recipe: installedRecipeMetadataFactory({
        id: recipeId1,
      }),
    }) as PersistedExtension;
    const extension2 = extensionFactory() as PersistedExtension;
    loadOptionsMock.mockResolvedValue({
      extensions: [extension1, extension2],
    });

    await initMarketplaceEnhancements();

    const activateButtons = document.querySelectorAll("a");
    expect(activateButtons[0].textContent).toBe(" Reactivate");
    expect(activateButtons[1].textContent).toBe(" Activate");
  });

  test("given user is logged in, when an activate button is clicked, should open the sidebar", async () => {
    getAuthHeadersMock.mockResolvedValue({ foo: "bar" });
    window.location.assign(MARKETPLACE_URL);
    // Recipe 1 is installed, recipe 2 is not
    const extension1 = extensionFactory({
      _recipe: installedRecipeMetadataFactory({
        id: recipeId1,
      }),
    }) as PersistedExtension;
    const extension2 = extensionFactory() as PersistedExtension;
    loadOptionsMock.mockResolvedValue({
      extensions: [extension1, extension2],
    });

    await initMarketplaceEnhancements();

    // Click an activate button
    const activateButtons = document.querySelectorAll("a");
    activateButtons[0].click();
    await waitForEffect();

    // The current page should not navigate away from the marketplace
    // @ts-expect-error -- some typing weirdness with jest-location-mock
    expect(window.location).toBeAt(MARKETPLACE_URL);
    // The show-sidebar function should be called
    expect(showFunctionMock).toHaveBeenCalledOnce();
  });

  test("given user is logged in, when loaded, should resume activation in progress", async () => {
    getAuthHeadersMock.mockResolvedValue({ foo: "bar" });
    window.location.assign(MARKETPLACE_URL);

    await initMarketplaceEnhancements();

    // The loadPageEnhancements function calls getInstalledRecipeIds,
    // which calls isUserLoggedIn, which calls getAuthHeaders. Then
    // there is another login check before loading the in progress
    // recipe activation.
    expect(getAuthHeadersMock).toHaveBeenCalledTimes(2);
    // The getInstalledRecipeIds function should call loadOptions
    // when the user is logged in
    expect(loadOptionsMock).toHaveBeenCalled();
    // The marketplace script should resume in-progress blueprint
    // activation when the user is logged in
    expect(getActivatingBlueprintMock).toHaveBeenCalled();
  });
});
