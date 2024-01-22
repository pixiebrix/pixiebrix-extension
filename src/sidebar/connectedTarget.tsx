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

import { expectContext } from "@/utils/expectContext";
import { assertNotNullish } from "@/utils/nullishUtils";
import { once } from "lodash";
import { type Target, getTabUrl } from "webext-tools";

export const getConnectedTabId = once((): number => {
  expectContext("sidebar");
  const tabId = new URLSearchParams(window.location.search).get("tabId");
  assertNotNullish(
    tabId,
    `No tabId argument was found on this page: ${window.location.href}`,
  );
  return Number(tabId);
});

export function getConnectedTarget(): Target {
  return { tabId: getConnectedTabId(), frameId: 0 };
}

export async function getAssociatedTargetUrl(): Promise<string | undefined> {
  return getTabUrl(getConnectedTabId());
}
