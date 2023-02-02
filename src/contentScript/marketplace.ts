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

import notify from "@/utils/notify";
import { type RegistryId } from "@/core";
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

function getActivateButtonLinks(): HTMLAnchorElement[] {
  return [
    ...document.querySelectorAll<HTMLAnchorElement>(
      "a[href^='https://app.pixiebrix.com/activate']"
    ),
  ];
}

async function getInstalledRecipeIds(): Promise<Set<RegistryId>> {
  const options = await loadOptions();
  return new Set(
    compact(options.extensions.map((extension) => extension._recipe?.id))
  );
}

async function isUserLoggedIn(): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  return Boolean(authHeaders);
}

function getInProgressRecipeActivation(): RegistryId | null {
  return null;
}

async function showSidebarActivationForRecipe(recipeId: RegistryId) {
  notify.info(`Showing activation for ${recipeId}`);

  const controller = new AbortController();

  await ensureSidebar();
  showActivateRecipeInSidebar({
    recipeId,
    heading: `Activate blueprint ${recipeId}`,
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

async function loadPageEnhancements(): Promise<void> {
  if (enhancementsLoaded) {
    notify.info("Enhancements already loaded, skipping");
    return;
  }

  notify.info("Marketplace enhancements loading...");

  // Change flag early to prevent multiple calls
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

    // Check if recipe is already activated
    if (installedRecipeIds.has(recipeId)) {
      button.innerHTML = '<i class="fas fa-sync-alt"></i> Reactivate';
    }

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      if (!(await isUserLoggedIn())) {
        window.open(button.href, "_blank", "noopener,noreferrer");
      }

      await showSidebarActivationForRecipe(recipeId);
    });
  }
}

export async function initMarketplaceEnhancements() {
  if (!startsWith(location.href, "https://www.pixiebrix.com/marketplace")) {
    return;
  }

  window.addEventListener("focus", async () => {
    notify.info("Marketplace tab focused");

    if (!(await isUserLoggedIn())) {
      notify.info("User not logged in");
      return;
    }

    await loadPageEnhancements();

    const recipeId = getInProgressRecipeActivation();
    if (recipeId) {
      await showSidebarActivationForRecipe(recipeId);
    }
  });

  if (!(await isUserLoggedIn())) {
    notify.info("User not logged in");
    return;
  }

  await loadPageEnhancements();
}
