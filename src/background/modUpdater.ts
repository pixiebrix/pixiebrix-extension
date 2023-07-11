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

import type { Me } from "@/types/contract";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import reportError from "@/telemetry/reportError";
import { loadOptions } from "@/store/extensionsStorage";
import type { IExtension } from "@/types/extensionTypes";

//const UPDATE_INTERVAL_MS = 10 * 60 * 1000;
const UPDATE_INTERVAL_MS = 60 * 1000;

// TODO: we should consider start extracting this request pattern into an api of some
//  kind that the background script can use
export async function autoModUpdatesEnabled(): Promise<boolean> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return false;
  }

  try {
    const { data: profile } = await client.get<Me>("/api/me/");

    return profile.flags.includes("automatic-mod-updates");
  } catch (error) {
    console.debug(
      "Skipping automatic mod updates because /api/me/ request failed"
    );
    reportError(error);
    return false;
  }
}

export async function getActivatedMarketplaceMods(): Promise<
  Array<IExtension["_recipe"]>
> {
  const { extensions: activatedMods } = await loadOptions();

  // Typically most Marketplace mods would not be a deployment. If this happens to be the case,
  // the deployment updater will handle the updates.
  return activatedMods
    .filter((mod) => mod._recipe?.sharing?.public && !mod._deployment)
    .map((mod) => mod._recipe);
}

async function fetchModUpdates(activatedMods: Array<IExtension["_recipe"]>) {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return false;
  }

  try {
    const { data: updates } = await client.post<{
      updates: {
        backwards_compatible: unknown[];
        backwards_incompatible: boolean;
      };
    }>("/api/registry/updates/", {
      // TODO: question - is it possible to have two different "extensions" from the same mod
      //  be at different versions?
      versions: Object.fromEntries(
        activatedMods.map(({ id, version }) => [id, version])
      ),
    });

    console.log("*** modUpdates", updates);
  } catch (error) {
    console.debug(
      "Skipping automatic mod updates because /registry/updates/ request failed"
    );
    reportError(error);
    return false;
  }
}

async function checkForModUpdates() {
  console.log("*** checking for mod updates");

  if (!(await autoModUpdatesEnabled())) {
    console.log("*** automatic mod updates disabled");
    return;
  }

  console.log("*** automatic mod updates enabled :)");

  const activatedMarketplaceMods = await getActivatedMarketplaceMods();

  console.log("*** activatedMarketplaceMods", activatedMarketplaceMods);

  // Send this list to the registry/updates endpoint & get back the list of updates
  const modUpdates = await fetchModUpdates(activatedMarketplaceMods);

  console.log("*** modUpdates", modUpdates);

  // Use the list to update the mods
}

export async function initModUpdater(): Promise<void> {
  setInterval(checkForModUpdates, UPDATE_INTERVAL_MS);
  void checkForModUpdates();
}
