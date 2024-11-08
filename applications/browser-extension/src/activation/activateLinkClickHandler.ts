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

import { type ModActivationPanelEntry } from "@/types/sidebarTypes";
import notify from "../utils/notify";
import {
  parseModActivationUrlSearchParams,
  isActivationUrl,
} from "./activationLinkUtils";
import { DEFAULT_SERVICE_URL } from "../urlConstants";

export default function activateLinkClickHandler(
  event: MouseEvent,
  callback: (entry: ModActivationPanelEntry) => void,
): void {
  const path = event.composedPath();
  const target = path[0] as HTMLElement;
  const link = target.closest("a");
  if (!link) {
    return;
  }

  const { href } = link;
  if (!isActivationUrl(href)) {
    return;
  }

  const mods = parseModActivationUrlSearchParams(
    new URL(href, DEFAULT_SERVICE_URL).searchParams,
  );

  if (mods.length === 0) {
    notify.warning(`No valid mod ids provided in URL: ${href}`);
    return;
  }

  event.preventDefault();

  callback({
    type: "activateMods",
    mods,
    heading: "Activating",
  });
}
