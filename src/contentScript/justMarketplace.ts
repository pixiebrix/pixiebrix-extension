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
import { compact, isEmpty } from "lodash";
import { loadOptions } from "@/store/extensionsStorage";
import { type RegistryId } from "@/types/registryTypes";

let enhancementsLoaded = false;

function getActivateButtonLinks(): NodeListOf<HTMLAnchorElement> {
  return document.querySelectorAll<HTMLAnchorElement>(
    "a[href*='.pixiebrix.com/activate']"
  );
}

async function getInstalledRecipeIds(): Promise<Set<RegistryId>> {
  // TODO: why does it matter if the user is logged in to detect installed recipes at this point?
  // if (!(await isUserLoggedIn())) {
  //   return new Set();
  // }

  const options = await loadOptions();

  if (!options) {
    return new Set();
  }

  return new Set(
    compact(options.extensions.map((extension) => extension._recipe?.id))
  );
}

async function loadOptimizedEnhancements(): Promise<void> {
  if (enhancementsLoaded) {
    return;
  }

  const activateButtonLinks = getActivateButtonLinks();
  if (isEmpty(activateButtonLinks)) {
    return;
  }

  const installedRecipeIds = await getInstalledRecipeIds();

  console.log("*** activateButtonLinks", activateButtonLinks);
  console.log("*** installedRecipeIds", installedRecipeIds);

  enhancementsLoaded = true;
}

if (location.protocol === "https:") {
  void loadOptimizedEnhancements();
} else {
  console.warn("Unsupported protocol", location.protocol);
}
