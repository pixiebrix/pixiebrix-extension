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

import {
  hideModActivationInSidebar,
  showModActivationInSidebar,
  showSidebar,
  sidePanelOnClose,
} from "./sidebarController";
import { isLinked } from "../auth/authStorage";
import {
  getActivatingMods,
  setActivatingMods,
} from "../background/messenger/external/_implementation";
import reportEvent from "../telemetry/reportEvent";
import { Events } from "../telemetry/events";
import { isLoadedInIframe } from "../utils/iframeUtils";
import { getActivatedModIds } from "../store/modComponents/modComponentStorage";
import { DEFAULT_SERVICE_URL } from "../urlConstants";
import { allSettled } from "../utils/promiseUtils";
import type { ModActivationConfig } from "@/types/modTypes";
import {
  getNextUrlFromActivateUrl,
  parseModActivationUrlSearchParams,
} from "../activation/activationLinkUtils";
import {
  type ACTIVATE_EVENT_DETAIL,
  ACTIVATE_EVENT_TYPE,
} from "./activationConstants";

let listener: EventListener | null;

async function showSidebarActivationForMods(
  mods: ModActivationConfig[],
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
  if (listener) {
    window.removeEventListener(ACTIVATE_EVENT_TYPE, listener);
  }

  listener = async (event: CustomEvent<ACTIVATE_EVENT_DETAIL>) => {
    const { activateUrl } = event.detail;
    const nextUrl = getNextUrlFromActivateUrl(activateUrl);

    if (!(await isLinked())) {
      // Open the activate link in the current browser tab
      window.location.assign(activateUrl);
      return;
    }

    const mods = parseModActivationUrlSearchParams(
      new URL(activateUrl).searchParams,
    );

    if (nextUrl) {
      await setActivatingMods({ mods });
      window.location.assign(nextUrl);
      return;
    }

    const activatedModIds = await getActivatedModIds();

    const modIds = mods.map((x) => x.modId);

    reportEvent(Events.START_MOD_ACTIVATE, {
      // For legacy, report the first mod id
      modId: modIds[0],
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

  if (
    // Do not attempt sidebar activation if the extension is not linked
    !(await isLinked()) ||
    // Do not show sidebar activation on hidden tabs/windows
    document.hidden ||
    // Do not show sidebar activation inside an iframe
    isLoadedInIframe() ||
    // Do not show sidebar activation in the Admin Console
    document.location.href.includes(DEFAULT_SERVICE_URL)
  ) {
    return;
  }

  const mods = (await getActivatingMods()) ?? [];
  if (mods.length === 0) {
    return;
  }

  await allSettled(
    [setActivatingMods(null), showSidebarActivationForMods(mods)],
    { catch: "ignore" },
  );
}
