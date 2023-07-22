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

import { showModActivationInSidebar } from "@/contentScript/sidebarController";
import { initSidebarActivation } from "@/contentScript/sidebarActivation";
import { loadOptions } from "@/store/extensionsStorage";
import { getDocument } from "@/starterBricks/starterBrickTestUtils";
import { validateRegistryId } from "@/types/helpers";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import { MARKETPLACE_URL } from "@/utils/strings";
import { getActivatingModIds } from "@/background/messenger/external/_implementation";
import {
  modComponentFactory,
  modComponentRecipeFactory,
} from "@/testUtils/factories/modComponentFactories";
import {
  loadActivationEnhancements,
  unloadActivationEnhancements,
} from "@/contentScript/loadActivationEnhancements";
import { isReadyInThisDocument } from "@/contentScript/ready";
import { isLinked } from "@/auth/token";

jest.mock("@/contentScript/sidebarController", () => ({
  ensureSidebar: jest.fn(),
  showModActivationInSidebar: jest.fn(),
  hideModActivationInSidebar: jest.fn(),
}));

const showFunctionMock = jest.mocked(showModActivationInSidebar);

jest.mock("@/auth/token", () => ({
  isLinked: jest.fn().mockResolvedValue(true),
}));

const isLinkedMock = jest.mocked(isLinked);

jest.mock("@/contentScript/ready", () => ({
  isReadyInThisDocument: jest.fn(() => true),
}));

jest.mock("@/store/extensionsStorage", () => ({
  loadOptions: jest.fn(),
}));

const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

jest.mock("@/background/messenger/external/_implementation", () => ({
  setActivatingMods: jest.fn(),
  getActivatingModIds: jest.fn(),
}));

jest.mock("@/sidebar/store", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

const getActivatingModIdsMock = jest.mocked(getActivatingModIds);

const recipeId1 = validateRegistryId("@pixies/misc/comment-and-vote");
const recipeId2 = validateRegistryId("@pixies/github/github-notifications");

const activateButtonsHtml = `
<div>
    <a class="btn btn-primary" data-activate-button href="https://app.pixiebrix.com/activate?id=${encodeURIComponent(
      recipeId1
    )}&utm_source=marketplace&utm_campaign=activate_blueprint" target="_blank" rel="noreferrer noopener"><i class="fas fa-plus-circle"></i> Activate</a>
    <a class="btn btn-primary" data-activate-button href="https://app.pixiebrix.com/activate?id=${encodeURIComponent(
      recipeId2
    )}&utm_source=marketplace&utm_campaign=activate_blueprint" target="_blank" rel="noreferrer noopener"><i class="fas fa-plus-circle"></i> Activate</a>
</div>
`;

describe("marketplace enhancements", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.innerHTML = getDocument(activateButtonsHtml).body.innerHTML;
    (isReadyInThisDocument as jest.Mock).mockImplementation(() => true);
  });

  afterEach(() => {
    jest.resetAllMocks();
    unloadActivationEnhancements();
  });

  test("given user is logged in, when an activate button is clicked, should open the sidebar", async () => {
    isLinkedMock.mockResolvedValue(true);
    window.location.assign(MARKETPLACE_URL);
    // Recipe 1 is installed, recipe 2 is not
    const modComponent1 = modComponentFactory({
      _recipe: modComponentRecipeFactory({
        id: recipeId1,
      }),
    }) as ActivatedModComponent;
    const modComponent2 = modComponentFactory() as ActivatedModComponent;
    loadOptionsMock.mockResolvedValue({
      extensions: [modComponent1, modComponent2],
    });

    await loadActivationEnhancements();
    await initSidebarActivation();

    // Click an activate button
    const activateButtons = document.querySelectorAll("a");
    activateButtons[0].click();
    await waitForEffect();

    // The current page should not navigate away from the marketplace
    expect(window.location.href).toBe(MARKETPLACE_URL);
    // The show-sidebar function should be called
    expect(showFunctionMock).toHaveBeenCalledOnce();
  });

  test("given user is not logged in, when activation button clicked, open admin console", async () => {
    isLinkedMock.mockResolvedValue(false);
    window.location.assign(MARKETPLACE_URL);

    await loadActivationEnhancements();
    await initSidebarActivation();

    // Click an activate button
    const activateButtons = document.querySelectorAll("a");
    activateButtons[0].click();
    await waitForEffect();

    // User is not logged in, so current page should navigate away from marketplace
    // @ts-expect-error -- some typing weirdness with jest-location-mock
    expect(window.location).not.toBeAt(MARKETPLACE_URL);
  });

  test("given user is not logged in, when loaded, then don't resume activation in progress", async () => {
    isLinkedMock.mockResolvedValue(false);
    window.location.assign(MARKETPLACE_URL);

    await initSidebarActivation();

    // Before loading in-progress recipe activation, isUserLoggedIn is called,
    // which calls isLinked
    expect(isLinkedMock).toHaveBeenCalledTimes(1);
    // The getInstalledRecipeIds function should not call loadOptions
    // when the user is not logged in
    expect(loadOptionsMock).not.toHaveBeenCalled();
    // The marketplace script should not resume in-progress blueprint
    // activation when the user is not logged in
    expect(getActivatingModIdsMock).not.toHaveBeenCalled();
  });

  test("given user is not logged in, when loaded, should change button text", async () => {
    isLinkedMock.mockResolvedValue(false);
    window.location.assign(MARKETPLACE_URL);
    // Recipe 1 is installed, recipe 2 is not
    const modComponent1 = modComponentFactory({
      _recipe: modComponentRecipeFactory({
        id: recipeId1,
      }),
    }) as ActivatedModComponent;
    const modComponent2 = modComponentFactory() as ActivatedModComponent;
    loadOptionsMock.mockResolvedValue({
      extensions: [modComponent1, modComponent2],
    });

    await loadActivationEnhancements();
    await initSidebarActivation();

    const activateButtons = document.querySelectorAll("a");
    // Text content starts with a space because of the icon
    expect(activateButtons[0].textContent).toBe("Reactivate");
    expect(activateButtons[1].textContent).toBe(" Activate");
  });

  test("given user is logged in, when loaded, should change button text for installed recipe", async () => {
    isLinkedMock.mockResolvedValue(true);
    window.location.assign(MARKETPLACE_URL);
    // Recipe 1 is installed, recipe 2 is not
    const modComponent1 = modComponentFactory({
      _recipe: modComponentRecipeFactory({
        id: recipeId1,
      }),
    }) as ActivatedModComponent;
    const modComponent2 = modComponentFactory() as ActivatedModComponent;
    loadOptionsMock.mockResolvedValue({
      extensions: [modComponent1, modComponent2],
    });

    await loadActivationEnhancements();
    await initSidebarActivation();

    const activateButtons = document.querySelectorAll("a");
    expect(activateButtons[0].textContent).toBe("Reactivate");
    expect(activateButtons[1].textContent).toBe(" Activate");
  });

  test("given user is logged in, when loaded, should resume activation in progress", async () => {
    isLinkedMock.mockResolvedValue(true);
    window.location.assign(MARKETPLACE_URL);

    await loadActivationEnhancements();
    await initSidebarActivation();

    // Before loading in-progress recipe activation, isUserLoggedIn is called,
    // which calls getAuthHeaders
    expect(isLinkedMock).toHaveBeenCalledTimes(1);
    // The getInstalledRecipeIds function should call loadOptions
    // when the user is logged in
    expect(loadOptionsMock).toHaveBeenCalled();
    // The marketplace script should resume in-progress blueprint
    // activation when the user is logged in
    expect(getActivatingModIdsMock).toHaveBeenCalled();
  });
});
