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

import { isRegistryId } from "@/types/helpers";
import {
  hideModActivationInSidebar,
  showModActivationInSidebar,
  showSidebar,
  sidePanelOnClose,
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
import { allSettled } from "@/utils/promiseUtils";
import type { Nullishable } from "@/utils/nullishUtils";
import type { ModOptionsPair } from "@/types/modTypes";
import {
  getNextUrlFromActivateUrl,
  parseModActivationUrl,
} from "@/activation/activationLinkUtils";

let listener: EventListener | null;

/**
 * Returns mod ids that are currently being activated, or null if there are none.
 *
 * Same as getActivatingBlueprints, but filters out any mod ids that are not syntactically valid.
 *
 * @see getActivatingModIds
 */
async function getInProgressModActivation(): Promise<
  Nullishable<ModOptionsPair[]>
> {
  const mods = (await getActivatingModIds()) ?? [];

  // Defensive validation
  const valid = mods.filter((x) => isRegistryId(x.modId));

  return valid.length > 0 ? valid : null;
}

async function showSidebarActivationForMods(
  mods: ModOptionsPair[],
): Promise<void> {
  await showSidebar();
  await showModActivationInSidebar({
    mods,
    heading: "Activating",
  });

  sidePanelOnClose(hideModActivationInSidebar);
}

export const ACTIVATE_EVENT_TYPE = "ActivateMods";
export type ACTIVATE_EVENT_DETAIL = { activateUrl: string };

function addActivateModsListener(): void {
  // Prevent duplicating listener
  window.removeEventListener(ACTIVATE_EVENT_TYPE, listener);

  listener = async (event: CustomEvent<ACTIVATE_EVENT_DETAIL>) => {
    const { activateUrl } = event.detail;
    const nextUrl = getNextUrlFromActivateUrl(activateUrl);

    if (!(await isLinked())) {
      // Open the activate link in the current browser tab
      window.location.assign(activateUrl);
      return;
    }

    const mods = parseModActivationUrl(activateUrl);

    if (nextUrl) {
      await setActivatingMods(mods);
      window.location.assign(nextUrl);
      return;
    }

    const activatedModIds = await getActivatedModIds();

    const modIds = mods.map((x) => x.modId);

    reportEvent(Events.START_MOD_ACTIVATE, {
      // For legacy, report the first mod id
      blueprintId: modIds,
      modIds,
      screen: "marketplace",
      reinstall: modIds.some((x) => activatedModIds.has(x)),
    });

    await showSidebarActivationForMods(mods);
  };

  window.addEventListener(ACTIVATE_EVENT_TYPE, listener);
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
    await allSettled(
      [
        // Clear out local storage
        setActivatingMods(null),
        showSidebarActivationForMods(modIds),
      ],
      { catch: "ignore" },
    );
  }
}
