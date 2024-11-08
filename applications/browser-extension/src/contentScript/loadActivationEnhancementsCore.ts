/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { isEmpty, startsWith } from "lodash";
import { DEFAULT_SERVICE_URL, MARKETPLACE_URL } from "../urlConstants";
import { getActivatedModIds } from "../store/modComponents/modComponentStorage";
import { pollUntilTruthy } from "../utils/promiseUtils";
import { getContentScriptState } from "./ready";
import { getRegistryIdsFromActivateUrlSearchParams } from "@/activation/activationLinkUtils";
import {
  type ACTIVATE_EVENT_DETAIL,
  ACTIVATE_EVENT_TYPE,
} from "./activationConstants";

let enhancementsLoaded = false;

function isMarketplacePage(): boolean {
  return startsWith(window.location.href, MARKETPLACE_URL);
}

/**
 * Returns a node list of mod activation links currently on the page.
 *
 * Includes marketplace activation links and shared links (e.g., on landing pages and emails).
 */
function getActivateButtonLinks(): NodeListOf<HTMLAnchorElement> {
  // Include DEFAULT_SERVICE_URL for use during local/staging testing
  return document.querySelectorAll<HTMLAnchorElement>(
    `a[href*='.pixiebrix.com/activate'], a[href*='${DEFAULT_SERVICE_URL}/activate']`,
  );
}

function changeActivateButtonToActiveLabel(button: HTMLAnchorElement): void {
  // Check if the button is already changed to an active label or if it isn't a special activate button that
  // should be swapped to an active label
  const isActivateButton = Object.hasOwn(button.dataset, "activateButton");
  if (button.innerHTML.includes("Reactivate") || !isActivateButton) {
    return;
  }

  button.className = "";
  button.innerHTML = "Reactivate";

  const activeLabel = $(
    '<div class="d-flex flex-column"><span class="text-success"><i class="fas fa-check"></i> Active</span></div>',
  );
  $(button).replaceWith(activeLabel);

  // Keeping the original button element in the dom so that the event listeners can be added in
  // the loadPageEnhancements function
  activeLabel.append(button);
}

export async function loadActivationEnhancements(): Promise<void> {
  if (enhancementsLoaded) {
    return;
  }

  enhancementsLoaded = true;

  const activateButtonLinks = getActivateButtonLinks();
  if (isEmpty(activateButtonLinks)) {
    return;
  }

  // XXX: consider moving after the button event listener is added to avoid race with the user clicking on the link
  const activatedModIds = await getActivatedModIds();

  for (const button of activateButtonLinks) {
    const url = new URL(button.href);
    const modIds = getRegistryIdsFromActivateUrlSearchParams(url.searchParams);
    if (modIds.length === 0) {
      continue;
    }

    // On Marketplace pages, check if the single mod / all mods in the pack already activated, and change button content
    // to indicate active status
    if (isMarketplacePage() && modIds.every((x) => activatedModIds.has(x))) {
      changeActivateButtonToActiveLabel(button);
    }

    // Replace the default click handler with direct mod activation
    button.addEventListener("click", async (event) => {
      event.preventDefault();

      const isReady = await pollUntilTruthy(
        () => getContentScriptState() === "ready",
        {
          maxWaitMillis: 2000,
          intervalMillis: 100,
        },
      );

      if (isReady) {
        const detail: ACTIVATE_EVENT_DETAIL = {
          // The button href may have changed since the listener was added, extract ids again
          activateUrl: button.href,
        };

        window.dispatchEvent(
          new CustomEvent(ACTIVATE_EVENT_TYPE, {
            detail,
          }),
        );
      } else {
        // Something probably went wrong with the content script, so navigate to the `/activate` url
        window.location.assign(button.href);
      }
    });
  }
}

export async function reloadActivationEnhancements(): Promise<void> {
  enhancementsLoaded = false;
  await loadActivationEnhancements();
}

/**
 * Unset loaded state. For use in test cleanup.
 * @internal
 */
export function TEST_unloadActivationEnhancements(): void {
  enhancementsLoaded = false;
}
