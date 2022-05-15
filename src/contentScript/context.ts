/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { uuidv4 } from "@/types/helpers";
import { PIXIEBRIX_READY_ATTRIBUTE } from "@/common";
import { set } from "lodash";

export const sessionId = uuidv4();
export const sessionTimestamp = new Date();

export let navigationId = uuidv4();
export let navigationTimestamp = new Date();

export let tabId: number;
export let frameId: number;

const PIXIEBRIX_READY_SYMBOL = Symbol.for("pixiebrix-content-script-ready");

declare global {
  interface Window {
    [PIXIEBRIX_READY_SYMBOL]?: true;
  }
}

/**
 * Set a unique id and timestamp for current navigation event.
 */
export function updateNavigationId(): void {
  navigationId = uuidv4();
  navigationTimestamp = new Date();
}

/**
 * Return the current navigation id for the contentScript.
 */
export function getNavigationId(): string {
  return navigationId;
}

export function markReady(): void {
  set(window, PIXIEBRIX_READY_SYMBOL, true);

  document.documentElement.setAttribute(PIXIEBRIX_READY_ATTRIBUTE, "");
}

export function updateTabInfo(info: { tabId: number; frameId: number }): void {
  tabId = info.tabId;
  frameId = info.frameId;
}
