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
  showSidebar,
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
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { getActivatedModIds } from "@/store/extensionsStorage";
import { DEFAULT_SERVICE_URL } from "@/urlConstants";
import { onSidePanelClosure } from "@/sidebar/sidePanel/messenger/api";

let listener: EventListener | null;

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
  const valid = modIds.filter((x: string) => isRegistryId(x));

  return valid.length > 0 ? valid : null;
}

async function showSidebarActivationForMods(
  modIds: RegistryId[],
): Promise<void> {
  const controller = new AbortController();

  await showSidebar();
  await showModActivationInSidebar({
    modIds,
    heading: "Activating",
  });

  onSidePanelClosure(controller);

  controller.signal.addEventListener("abort", () => {
    void hideModActivationInSidebar();
  });
}

function getNextUrlFromActivateUrl(activateUrl: string): string | null {
  const url = new URL(activateUrl);
  const searchParams = new URLSearchParams(url.search);
  return searchParams.get("nextUrl");
}

function addActivateModsListener(): void {
  // Prevent duplicating listener
  window.removeEventListener("ActivateMods", listener);

  listener = async (
    event: CustomEvent<{ modIds: RegistryId[]; activateUrl: string }>,
  ) => {
    const { modIds, activateUrl } = event.detail;
    const nextUrl = getNextUrlFromActivateUrl(activateUrl);

    if (!(await isLinked())) {
      // Open the activate link in the current browser tab
      window.location.assign(activateUrl);
      return;
    }

    if (nextUrl) {
      await setActivatingMods({ blueprintId: modIds });
      window.location.assign(nextUrl);
      return;
    }

    const activatedModIds = await getActivatedModIds();

    reportEvent(Events.START_MOD_ACTIVATE, {
      // For legacy, report the first mod id
      blueprintId: modIds[0],
      modIds,
      screen: "marketplace",
      reinstall: modIds.some((x) => activatedModIds.has(x)),
    });

    await showSidebarActivationForMods(modIds);
  };

  window.addEventListener("ActivateMods", listener);
}

export async function initSidebarActivation(): Promise<void> {
  addActivateModsListener();

  if (!(await isLinked())) {
    return;
  }

  const modIds = await getInProgressModActivation();

  // Do not try to show sidebar activation inside an iframe or in the Admin Console
  if (
    modIds &&
    !isLoadedInIframe() &&
    !document.location.href.includes(DEFAULT_SERVICE_URL)
  ) {
    await Promise.allSettled([
      // Clear out local storage
      setActivatingMods({ blueprintId: null }),
      showSidebarActivationForMods(modIds),
    ]);
  }
}
