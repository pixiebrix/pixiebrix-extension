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
import { compact, isEmpty, startsWith } from "lodash";
import { loadOptions } from "@/store/extensionsStorage";
import { type RegistryId } from "@/types/registryTypes";
import { validateRegistryId } from "@/types/helpers";
import { isReadyInThisDocument } from "@/contentScript/ready";
import { pollUntilTruthy } from "@/utils";
import { MARKETPLACE_URL } from "@/utils/strings";

let enhancementsLoaded = false;

function getActivateButtonLinks(): NodeListOf<HTMLAnchorElement> {
  return document.querySelectorAll<HTMLAnchorElement>(
    "a[href*='.pixiebrix.com/activate']"
  );
}

export async function getInstalledRecipeIds(): Promise<Set<RegistryId>> {
  const options = await loadOptions();

  if (!options) {
    return new Set();
  }

  return new Set(
    compact(options.extensions.map((extension) => extension._recipe?.id))
  );
}

function changeActivateButtonToActiveLabel(button: HTMLAnchorElement) {
  // Check if the button is already changed to an active label or if it isn't a special activate button that
  // should be swapped to an active label
  const isActivateButton = Object.hasOwn(button.dataset, "activateButton");
  if (button.innerHTML.includes("Reactivate") || !isActivateButton) {
    return;
  }

  button.className = "";
  button.innerHTML = "Reactivate";

  const activeLabel = $(
    '<div class="d-flex flex-column"><span class="text-success"><i class="fas fa-check"></i> Active</span></div>'
  );
  $(button).replaceWith(activeLabel);

  // Keeping the original button element in the dom so that the event listeners can be added in
  // the loadPageEnhancements function
  activeLabel.append(button);
}

export async function loadOptimizedEnhancements(): Promise<void> {
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

      const isContentScriptReady = await pollUntilTruthy(
        isReadyInThisDocument,
        {
          maxWaitMillis: 2000,
          intervalMillis: 100,
        }
      );

      if (isContentScriptReady) {
        window.dispatchEvent(
          new CustomEvent("ActivateRecipe", {
            detail: { recipeId, activateUrl: button.href },
          })
        );
      } else {
        // Something probably went wrong with the content script, so just navigate to the activate url
        window.location.assign(button.href);
      }
    });
  }
}

export async function reloadOptimizedEnhancements() {
  enhancementsLoaded = false;
  await loadOptimizedEnhancements();
}

/**
 * This should only be used for testing purposes
 */
export function unloadOptimizedEnhancements() {
  enhancementsLoaded = false;
}

if (location.protocol === "https:") {
  if (startsWith(window.location.href, MARKETPLACE_URL)) {
    void loadOptimizedEnhancements();
  }
} else {
  console.warn("Unsupported protocol", location.protocol);
}
