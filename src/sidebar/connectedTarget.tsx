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

import { isMV3 } from "@/mv3/api";
import { expectContext } from "@/utils/expectContext";
import { assertNotNullish } from "@/utils/nullishUtils";
import { once } from "lodash";
import { type TopLevelFrame, getTopLevelFrame } from "webext-messenger";
import { getTabUrl } from "webext-tools";

function getConnectedTabIdMv3(): number {
  expectContext("sidebar");
  const tabId = new URLSearchParams(window.location.search).get("tabId");
  assertNotNullish(
    tabId,
    `No tabId argument was found on this page: ${window.location.href}`,
  );
  return Number(tabId);
}

async function getConnectedTabIdMv2() {
  const { tabId } = await getTopLevelFrame();
  return tabId;
}

export const getConnectedTabId = once(
  isMV3() ? getConnectedTabIdMv3 : getConnectedTabIdMv2,
);
export const getConnectedTarget = isMV3()
  ? (): TopLevelFrame => ({ tabId: getConnectedTabIdMv3(), frameId: 0 })
  : getTopLevelFrame;

export async function getAssociatedTargetUrl(): Promise<string | undefined> {
  return getTabUrl(await getConnectedTarget());
}
