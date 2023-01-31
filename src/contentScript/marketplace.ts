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
import { compact, isEmpty } from "lodash";
import { validateRegistryId } from "@/types/helpers";
import {
  ensureSidebar,
  hideActivateRecipeInSidebar,
  PANEL_HIDING_EVENT,
  showActivateRecipeInSidebar,
} from "@/contentScript/sidebarController";

async function getInstalledRecipeIds(): Promise<RegistryId[]> {
  const options = await loadOptions();
  return compact(options.extensions.map((extension) => extension._recipe?.id));
}

export async function initMarketplaceEnhancements() {
  if (window.location.href !== "https://www.pixiebrix.com/marketplace/") {
    return;
  }

  notify.info("Marketplace enhancements loading...");

  const activateLinkButtons = $(
    "a[href^='https://app.pixiebrix.com/activate']"
  );

  if (isEmpty(activateLinkButtons)) {
    return;
  }

  const installedRecipeIds = await getInstalledRecipeIds();

  for (const button of activateLinkButtons) {
    const { href } = button as HTMLAnchorElement;
    const url = new URL(href);
    const recipeId = validateRegistryId(url.searchParams.get("id"));

    const controller = new AbortController();

    // Check if blueprint is activated
    if (installedRecipeIds.includes(recipeId)) {
      button.innerHTML = '<i class="fas fa-sync-alt"></i> Reactivate';
    }

    button.addEventListener("click", async (event) => {
      event.preventDefault();
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
    });
  }
}
