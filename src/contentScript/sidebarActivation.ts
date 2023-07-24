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
import { isRegistryId } from "@/types/helpers";
import {
  ensureSidebar,
  HIDE_SIDEBAR_EVENT_NAME,
  hideModActivationInSidebar,
  showModActivationInSidebar,
} from "@/contentScript/sidebarController";
import { isLinked } from "@/auth/token";
import {
  getActivatingModIds,
  setActivatingMods,
} from "@/background/messenger/external/_implementation";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { getInstalledRecipeIds } from "@/contentScript/loadActivationEnhancements";
import { isLoadedInIframe } from "@/iframeUtils";

/**
 * Returns mod ids that are currently being activated, or null if there are none.
 *
 * Same as getActivatingBlueprints, but filters out any mod ids that are not syntactically valid.
 *
 * @see getActivatingModIds
 */
async function getInProgressModActivation(): Promise<RegistryId[] | null> {
  const modIds = (await getActivatingModIds()) ?? [];

  // Defensive validation
  const valid = modIds.filter((x) => isRegistryId(x));

  return valid.length > 0 ? valid : null;
}

async function showSidebarActivationForMods(
  modIds: RegistryId[]
): Promise<void> {
  const controller = new AbortController();

  await ensureSidebar();
  showModActivationInSidebar({
    modIds,
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
    hideModActivationInSidebar();
  });
}

function getNextUrlFromActivateUrl(activateUrl: string): string | null {
  const url = new URL(activateUrl);
  const searchParams = new URLSearchParams(url.search);
  return searchParams.get("nextUrl");
}

function addActivateRecipeListener() {
  window.addEventListener(
    "ActivateRecipe",
    async (
      event: CustomEvent<{ recipeId: RegistryId; activateUrl: string | URL }>
    ) => {
      const { recipeId: modId, activateUrl } = event.detail;
      const nextUrl = getNextUrlFromActivateUrl(activateUrl as string);

      if (!(await isLinked())) {
        // Open the activate link in the current browser tab
        window.location.assign(activateUrl);
        return;
      }

      if (nextUrl) {
        await setActivatingMods({ blueprintId: modId });
        window.location.assign(nextUrl);
        return;
      }

      const installedRecipeIds = await getInstalledRecipeIds();

      reportEvent(Events.START_MOD_ACTIVATE, {
        blueprintId: modId,
        screen: "marketplace",
        reinstall: installedRecipeIds.has(modId),
      });

      await showSidebarActivationForMods([modId]);
    }
  );
}

export async function initSidebarActivation(): Promise<void> {
  addActivateRecipeListener();

  if (!(await isLinked())) {
    return;
  }

  const modIds = await getInProgressModActivation();

  // Do not try to show sidebar activation inside an iframe
  if (modIds && !isLoadedInIframe()) {
    await Promise.allSettled([
      // Clear out local storage
      setActivatingMods({ blueprintId: null }),
      showSidebarActivationForMods(modIds),
    ]);
  }
}
