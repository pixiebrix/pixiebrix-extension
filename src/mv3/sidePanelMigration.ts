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

/** @file Temporary helpers useful for the MV3 sidePanel transition */

import { getMethod, getTopLevelFrame } from "webext-messenger";
import {
  _openSidePanel,
  getAssociatedTarget,
} from "@/sidebar/sidePanel/messenger/api";
import { isMV3 } from "./api";

export const getTopFrameFromSidebar = isMV3()
  ? getAssociatedTarget
  : getTopLevelFrame;

export const openSidePanel = isMV3()
  ? _openSidePanel
  : // Called via `getMethod` until we complete the strictNullChecks transition
    async (tabId: number) => getMethod("SHOW_SIDEBAR")({ tabId });
