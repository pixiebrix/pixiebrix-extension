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

import { type RegistryId } from "@/types/registryTypes";
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
  getEncodedOptionsFromActivateUrl,
  getNextUrlFromActivateUrl,
  parseEncodedOptions,
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

    const encodedOptions = getEncodedOptionsFromActivateUrl(activateUrl);
    const initialOptions = parseEncodedOptions(encodedOptions);
    // NOTE: currently applying same options to all mods
    const mods = modIds.map((modId) => ({ modId, initialOptions }));

    if (nextUrl) {
      await setActivatingMods(mods);
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

    await showSidebarActivationForMods(mods);
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
