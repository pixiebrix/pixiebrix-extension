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

import { createSendScriptMessage } from "@/pageScript/messenger/pigeon";
import {
  type Framework,
  GET_COMPONENT_DATA,
  GET_COMPONENT_INFO,
  SET_COMPONENT_DATA,
  DETECT_FRAMEWORK_VERSIONS,
  type FrameworkMeta,
  READ_WINDOW,
} from "@/pageScript/messenger/constants";
import { type ReaderOutput } from "@/core";
import { type ElementInfo } from "@/pageScript/frameworks";

export type PathSpec =
  | string
  | string[]
  | Record<string, string | { path: string; args: unknown }>;

export type ReadOptions = {
  pathSpec?: PathSpec;
  waitMillis?: number;
  retryMillis?: number;
  traverseUp?: number;
  rootProp?: string;
  optional?: boolean;
};

export type ReadPayload = ReadOptions & {
  framework: Framework;
  selector: string | null;
};

export interface WritePayload {
  framework: Framework;
  selector: string;
  valueMap: Record<string, unknown>;
}

export const setComponentData = createSendScriptMessage<void, WritePayload>(
  SET_COMPONENT_DATA
);

export const getComponentData = createSendScriptMessage<
  ReaderOutput,
  ReadPayload
>(GET_COMPONENT_DATA);

export const getElementInfo = createSendScriptMessage<
  ElementInfo,
  { selector: string; framework?: Framework; traverseUp?: number }
>(GET_COMPONENT_INFO);

type ReadSpec = <T extends Record<string, string>>(arg: {
  pathSpec: T;
  waitMillis?: number;
}) => Promise<Record<keyof T, unknown>>;

export const withReadWindow = createSendScriptMessage(
  READ_WINDOW
) as unknown as ReadSpec;

export const withDetectFrameworkVersions = createSendScriptMessage<
  FrameworkMeta[]
>(DETECT_FRAMEWORK_VERSIONS);
