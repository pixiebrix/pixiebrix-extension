/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { HandlerOptions } from "@/messaging/protocol";
import type { Target } from "@/types";

export const PORT_NAME = "devtools-page";
export const MESSAGE_PREFIX = "@@pixiebrix/devtools/";

export type TabId = number;
export type Nonce = string;

export type PromiseHandler = [
  (value: unknown) => void,
  (value: unknown) => void
];

export interface BackgroundResponse {
  type: string;
  meta: Meta;
  payload: unknown;
}

export interface HandlerEntry {
  handler: (
    target: Target
  ) => (...args: unknown[]) => unknown | Promise<unknown>;
  options: HandlerOptions;
}

export interface Meta {
  nonce: Nonce;
  tabId: TabId;
  frameId: number;
  [index: string]: unknown;
}
