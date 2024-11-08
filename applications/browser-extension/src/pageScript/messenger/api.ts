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

import { createSendScriptMessage } from "./sender";
import {
  type Framework,
  GET_COMPONENT_DATA,
  GET_ELEMENT_INFO,
  SET_COMPONENT_DATA,
  READ_WINDOW,
  CKEDITOR_SET_VALUE,
  CKEDITOR_INSERT_TEXT,
} from "./constants";
import { type ElementInfo } from "../../utils/inference/selectorTypes";
import { type JsonObject, type JsonValue } from "type-fest";

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
  valueMap: UnknownObject;
}

export const setComponentData = createSendScriptMessage<void, WritePayload>(
  SET_COMPONENT_DATA,
);

/**
 * Returns front-end framework component data for the given selector and framework.
 */
export const getComponentData = createSendScriptMessage<
  JsonObject,
  ReadPayload
>(GET_COMPONENT_DATA);

export const getElementInfo = createSendScriptMessage<
  ElementInfo,
  { selector: string }
>(GET_ELEMENT_INFO);

type ReadSpec = <T extends Record<string, string>>(arg: {
  pathSpec: T;
  waitMillis?: number;
}) => Promise<Record<keyof T, JsonValue>>;

export const withReadWindow: ReadSpec = createSendScriptMessage(READ_WINDOW);

export const setCKEditorData = createSendScriptMessage<
  void,
  { selector: string; value: string }
>(CKEDITOR_SET_VALUE);

export const insertCKEditorData = createSendScriptMessage<
  void,
  { selector: string; value: string }
>(CKEDITOR_INSERT_TEXT);
