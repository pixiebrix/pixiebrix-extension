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

import { validateRegistryId } from "@/types/helpers";
import { type ActivateRecipePanelEntry } from "@/types/sidebarTypes";
import { isActivationUrl } from "@/activation/ActivationLink";
import notify from "@/utils/notify";

export default function activateLinkClickHandler(
  event: MouseEvent,
  callback: (entry: ActivateRecipePanelEntry) => void
) {
  const path = event.composedPath();
  const target = path[0] as HTMLElement;
  const link = target.closest("a");
  if (!link) {
    return;
  }

  const href = link.getAttribute("href");
  if (!isActivationUrl(href)) {
    return;
  }

  const url = new URL(href);
  const recipeId = validateRegistryId(url.searchParams.get("id"));
  if (!recipeId) {
    notify.warning(`Recipe id param not found in activate link url: ${href}`);
    return;
  }

  event.preventDefault();

  const entry: ActivateRecipePanelEntry = {
    type: "activateRecipe",
    recipeId,
    heading: "Activating",
  };

  callback(entry);
}
