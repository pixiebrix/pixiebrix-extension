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

import { type RegistryId } from "@/types/registryTypes";
import { loadOptions } from "@/store/extensionsStorage";
import { compact, isEmpty, startsWith } from "lodash";
import { validateRegistryId } from "@/types/helpers";
import {
  ensureSidebar,
  hideActivateRecipeInSidebar,
  PANEL_HIDING_EVENT,
  showActivateRecipeInSidebar,
} from "@/contentScript/sidebarController";
import { getAuthHeaders } from "@/auth/token";
import { MARKETPLACE_URL } from "@/utils/strings";
import {
  getActivatingBlueprint,
  setActivatingBlueprint,
} from "@/background/messenger/external/_implementation";
import reportError from "@/telemetry/reportError";
import { reportEvent } from "@/telemetry/events";

function getActivateButtonLinks(): NodeListOf<HTMLAnchorElement> {
  return document.querySelectorAll<HTMLAnchorElement>(
    "a[href*='.pixiebrix.com/activate']"
  );
}

async function getInstalledRecipeIds(): Promise<Set<RegistryId>> {
  if (!(await isUserLoggedIn())) {
    return new Set();
  }

  const options = await loadOptions();

  if (!options) {
    return new Set();
  }

  return new Set(
    compact(options.extensions.map((extension) => extension._recipe?.id))
  );
}

async function isUserLoggedIn(): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  return Boolean(authHeaders);
}

async function getInProgressRecipeActivation(): Promise<RegistryId | null> {
  try {
    const activatingRecipeId = await getActivatingBlueprint();
    if (typeof activatingRecipeId !== "string") {
      return null;
    }

    return validateRegistryId(activatingRecipeId);
  } catch (error) {
    reportError(error);
    return null;
  }
}

const changeActivateButtonToActiveLabel = (button: HTMLAnchorElement) => {
  if (button.innerHTML.includes("Reactivate")) {
    return;
  }

  button.className = "";
  button.innerHTML = "Reactivate";

  const parent = button.parentElement;

  const activeLabelContainer = document.createElement("div");
  activeLabelContainer.classList.add("d-flex", "flex-column");

  const activeLabel = document.createElement("span");
  activeLabel.classList.add("text-success");
  activeLabel.innerHTML = '<i class="fas fa-check"></i> Active';

  activeLabelContainer.append(activeLabel);
  parent?.replaceChild(activeLabelContainer, button);
  activeLabelContainer.append(button);
};

async function showSidebarActivationForRecipe(recipeId: RegistryId) {
  const controller = new AbortController();

  await ensureSidebar();
  showActivateRecipeInSidebar({
    recipeId,
    heading: "Activating",
  });
  window.addEventListener(
    PANEL_HIDING_EVENT,
    () => {
      controller.abort();
    },
    {
      signal: controller.signal,
    }
  );
  controller.signal.addEventListener("abort", () => {
    hideActivateRecipeInSidebar(recipeId);
  });
}

let enhancementsLoaded = false;

export async function loadPageEnhancements(): Promise<void> {
  if (enhancementsLoaded) {
    return;
  }

  enhancementsLoaded = true;

  const activateButtonLinks = getActivateButtonLinks();
  if (isEmpty(activateButtonLinks)) {
    return;
  }

  const installedRecipeIds = await getInstalledRecipeIds();

  for (const button of activateButtonLinks) {
    const url = new URL(button.href);
    let recipeId: RegistryId;
    try {
      recipeId = validateRegistryId(url.searchParams.get("id"));
    } catch {
      continue;
    }

    // Check if recipe is already activated, and change button content to indicate active status
    if (installedRecipeIds.has(recipeId)) {
      changeActivateButtonToActiveLabel(button);
    }

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      if (!(await isUserLoggedIn())) {
        // Open the activate link in the current browser tab
        window.location.assign(button.href);
        return;
      }

      reportEvent("StartInstallBlueprint", {
        blueprintId: recipeId,
        screen: "marketplace",
        reinstall: installedRecipeIds.has(recipeId),
      });

      await showSidebarActivationForRecipe(recipeId);
    });
  }
}

export async function reloadMarketplaceEnhancements() {
  enhancementsLoaded = false;
  await loadPageEnhancements();
}

export async function initMarketplaceEnhancements() {
  if (!startsWith(window.location.href, MARKETPLACE_URL)) {
    return;
  }

  await loadPageEnhancements();

  if (!(await isUserLoggedIn())) {
    return;
  }

  const recipeId = await getInProgressRecipeActivation();
  if (recipeId) {
    await setActivatingBlueprint({ blueprintId: null });
    await showSidebarActivationForRecipe(recipeId);
  }
}

/**
 * This should only be used for testing purposes
 */
export function unloadMarketplaceEnhancements() {
  enhancementsLoaded = false;
}
