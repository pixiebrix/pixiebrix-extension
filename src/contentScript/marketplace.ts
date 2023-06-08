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
import { compact, startsWith } from "lodash";
import { validateRegistryId } from "@/types/helpers";
import {
  ensureSidebar,
  hideActivateRecipeInSidebar,
  HIDE_SIDEBAR_EVENT_NAME,
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

async function showSidebarActivationForRecipe(recipeId: RegistryId) {
  const controller = new AbortController();

  await ensureSidebar();
  showActivateRecipeInSidebar({
    recipeId,
    heading: "Activating",
  });
  window.addEventListener(
    HIDE_SIDEBAR_EVENT_NAME,
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

function addActivateRecipeListener() {
  window.addEventListener("ActivateRecipe", async (event: CustomEvent) => {
    console.log("*** ActivateRecipe event received", event.detail);

    const { recipeId, activateUrl } = event.detail;

    if (!(await isUserLoggedIn())) {
      // Open the activate link in the current browser tab
      window.location.assign(activateUrl);
      return;
    }

    const installedRecipeIds = await getInstalledRecipeIds();

    reportEvent("StartInstallBlueprint", {
      blueprintId: recipeId,
      screen: "marketplace",
      reinstall: installedRecipeIds.has(recipeId),
    });

    await showSidebarActivationForRecipe(recipeId);
  });
}

export async function initMarketplaceEnhancements() {
  console.log("*** initMarketplaceEnhancements");
  addActivateRecipeListener();

  if (!startsWith(window.location.href, MARKETPLACE_URL)) {
    return;
  }

  if (!(await isUserLoggedIn())) {
    return;
  }

  const recipeId = await getInProgressRecipeActivation();
  if (recipeId) {
    await setActivatingBlueprint({ blueprintId: null });
    await showSidebarActivationForRecipe(recipeId);
  }
}
