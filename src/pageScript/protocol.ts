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

import { createSendScriptMessage } from "@/messaging/chrome";
import {
  Framework,
  GET_COMPONENT_DATA,
  SET_COMPONENT_DATA,
} from "@/messaging/constants";
import { ReaderOutput } from "@/core";

export type PathSpec =
  | string
  | string[]
  | Record<string, string | { path: string; args: unknown }>;

export interface ReadOptions {
  pathSpec?: PathSpec;
  waitMillis?: number;
  retryMillis?: number;
  traverseUp?: number;
  rootProp?: string;
}

export type ReadPayload = ReadOptions & {
  framework: Framework;
  selector: string;
};

export interface WritePayload {
  framework: Framework;
  selector: string;
  valueMap: { [key: string]: unknown };
}

export const setComponentData = createSendScriptMessage<void, WritePayload>(
  SET_COMPONENT_DATA
);

export const getComponentData = createSendScriptMessage<
  ReaderOutput,
  ReadPayload
>(GET_COMPONENT_DATA);
