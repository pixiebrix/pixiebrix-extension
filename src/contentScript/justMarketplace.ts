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
import { isEmpty } from "lodash";

let enhancementsLoaded = false;

function getActivateButtonLinks(): NodeListOf<HTMLAnchorElement> {
  return document.querySelectorAll<HTMLAnchorElement>(
    "a[href*='.pixiebrix.com/activate']"
  );
}

async function loadPageEnhancements(): Promise<void> {
  if (enhancementsLoaded) {
    return;
  }

  const activateButtonLinks = getActivateButtonLinks();
  if (isEmpty(activateButtonLinks)) {
    return;
  }

  console.log("*** activateButtonLinks", activateButtonLinks);

  enhancementsLoaded = true;
}

if (location.protocol === "https:") {
  void loadPageEnhancements();
} else {
  console.warn("Unsupported protocol", location.protocol);
}
