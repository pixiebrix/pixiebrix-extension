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

import { browserAction } from "@/mv3/api";
import { type MessengerMeta } from "webext-messenger";
import { type ModComponentRef } from "@/types/modComponentTypes";
import { setTabBadgeModComponentRef } from "@/background/browserAction";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Browsers will set the badge text color to white or black depending on the background color for accessible contrast.
 * This value should be a dark enough background for white text. MV3 introduces a setBadgeTextColor method, which is
 * not supported by MV2.
 * @see https://developer.chrome.com/docs/extensions/reference/api/action#method-setBadgeTextColor
 */
export const DEFAULT_BADGE_COLOR = "#b4183f";

export async function setToolbarBadge(
  this: MessengerMeta,
  text: string | null,
  options: { modComponentRef?: ModComponentRef } = {},
): Promise<void> {
  const tabId = this?.trace?.[0]?.tab?.id;

  assertNotNullish(tabId, "Unable to set toolbar badge: no tabId");

  await Promise.all([
    browserAction.setBadgeText({
      text: text ?? "",
      tabId,
    }),
    browserAction.setBadgeBackgroundColor({
      color: DEFAULT_BADGE_COLOR,
      tabId,
    }),
    setTabBadgeModComponentRef(tabId, text ? options.modComponentRef : null),
  ]);
}
