/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { v4 as uuidv4 } from "uuid";

export const sessionId = uuidv4();
export const sessionTimestamp = new Date();

export let navigationId = uuidv4();
export let navigationTimestamp = new Date();

export let tabId: number;
export let frameId: number;

export let ready = false;

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
  ready = true;
}

export function updateTabInfo(info: { tabId: number; frameId: number }): void {
  tabId = info.tabId;
  frameId = info.frameId;
}
