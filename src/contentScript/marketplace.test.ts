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
import { initMarketplaceEnhancements } from "@/contentScript/marketplace";
import { loadOptions } from "@/store/extensionsStorage";
import { fireEvent } from "@testing-library/react";
import { getDocument } from "@/extensionPoints/extensionPointTestUtils";
import { validateRegistryId } from "@/types/helpers";
import {
  extensionFactory,
  installedRecipeMetadataFactory,
} from "@/testUtils/factories";
import { type PersistedExtension } from "@/core";
import { waitForEffect } from "@/testUtils/testHelpers";

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

const windowListenerSpy = jest.spyOn(window, "addEventListener");

function expectListenerAdded() {
  expect(windowListenerSpy).toHaveBeenCalledWith("focus", expect.any(Function));
}

function expectFocusListenerNotAdded() {
  expect(windowListenerSpy).not.toHaveBeenCalled();
}

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

const MARKETPLACE_URL = "https://www.pixiebrix.com/marketplace";

// Patch window.addEventListener for cleanup between test cases
//  See: https://stackoverflow.com/questions/42805128
type refType = {
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};
const refs: refType[] = [];

beforeAll(() => {
  const originalAddEventListener = window.addEventListener;

  function addEventListenerSpy(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    // Store listener reference so it can be removed during reset
    refs.push({ type, listener, options });
    // Call original window.addEventListener
    originalAddEventListener(type, listener, options);
  }

  global.window.addEventListener = addEventListenerSpy;
});

beforeEach(() => {
  while (refs.length > 0) {
    const ref = refs.pop();
    global.window.removeEventListener(ref.type, ref.listener, ref.options);
  }
});

describe("marketplace enhancements", () => {
  beforeAll(() => {
    const originalAddEventListener = window.addEventListener;

    function addEventListenerSpy(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      // Store listener reference so it can be removed during reset
      refs.push({ type, listener, options });
      // Call original window.addEventListener
      originalAddEventListener(type, listener, options);
    }

    global.window.addEventListener = addEventListenerSpy;
  });

  beforeEach(() => {
    window.document.body.innerHTML = "";
    document.body.innerHTML = "";
    document.body.innerHTML = getDocument(activateButtonsHtml).body.innerHTML;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("given a non-marketplace page, when loaded", async () => {
    window.location.assign("https://www.google.com/");

    await initMarketplaceEnhancements();

    expectFocusListenerNotAdded();
    // The checks for auth state and installed recipes should not be called
    expect(getAuthHeadersMock).not.toHaveBeenCalled();
    expect(loadOptionsMock).not.toHaveBeenCalled();
  });

  test("given user is not logged in, when activation button clicked, should open admin console", async () => {
    getAuthHeadersMock.mockResolvedValue(null);
    window.location.assign(MARKETPLACE_URL);

    await initMarketplaceEnhancements();

    // Click an activate button
    const activateButtons = document.querySelectorAll("a");
    activateButtons[0].click();
    await waitForEffect();

    // User is not logged in, so current page should navigate away from marketplace
    expect(window.location).not.toBeAt(MARKETPLACE_URL);
  });

  test("given user is not logged in, when window is re-focused, should not resume activation in progress", async () => {
    getAuthHeadersMock.mockResolvedValue(null);
    window.location.assign(MARKETPLACE_URL);

    await initMarketplaceEnhancements();

    // Window focus listener added
    expectListenerAdded();
    // The loadPageEnhancements function calls getInstalledRecipeIds,
    // which calls isUserLoggedIn, which calls getAuthHeaders
    expect(getAuthHeadersMock).toHaveBeenCalledOnce();
    // The getInstalledRecipeIds function should not call loadOptions
    // when the user is not logged in
    expect(loadOptionsMock).not.toHaveBeenCalled();

    fireEvent.focus(window);
    await waitForEffect();

    // The window focus listener should check login state again
    expect(getAuthHeadersMock).toHaveBeenCalledTimes(2);
    // TODO: check that the function to load in-progress recipe
    //  activation is not called
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
    expect(window.location).toBeAt(MARKETPLACE_URL);
    // The show-sidebar function should be called
    expect(showFunctionMock).toHaveBeenCalledOnce();
  });
});
