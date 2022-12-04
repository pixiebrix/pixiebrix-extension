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

import {
  type ActionType,
  type Message,
  type SerializedError,
  type Meta,
} from "@/core";
import { serializeError } from "serialize-error";
import { createSendScriptMessage } from "./chrome";
import {
  DETECT_FRAMEWORK_VERSIONS,
  type FrameworkMeta,
  READ_WINDOW,
  SEARCH_WINDOW,
} from "./constants";

// eslint-disable-next-line @typescript-eslint/ban-types -- Line can be dropped once we migrate to `webext-messenger`
export type SerializableResponse = boolean | string | number | object | void;

export interface RemoteProcedureCallRequest<TMeta extends Meta = Meta>
  extends Message<ActionType, TMeta> {
  payload: unknown[];
}

export type HandlerOptions = {
  asyncResponse?: boolean;
};

export type Handler = (...args: unknown[]) => Promise<SerializableResponse>;

export type HandlerEntry = {
  handler: Handler;
  options: HandlerOptions;
};

interface ErrorResponse {
  $$error: SerializedError;
}

export function isNotification({
  asyncResponse = true,
}: HandlerOptions = {}): boolean {
  return !asyncResponse;
}

export function isErrorResponse(ex: unknown): ex is ErrorResponse {
  return typeof ex === "object" && ex != null && "$$error" in ex;
}

export function toErrorResponse(
  requestType: string,
  ex: unknown
): ErrorResponse {
  return { $$error: serializeError(ex) };
}

export function isRemoteProcedureCallRequest(
  message: unknown
): message is RemoteProcedureCallRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a type guard function and it uses ?.
  return typeof (message as any)?.type === "string";
}

type ReadSpec = <T extends Record<string, string>>(arg: {
  pathSpec: T;
  waitMillis?: number;
}) => Promise<Record<keyof T, unknown>>;

export const withReadWindow = createSendScriptMessage(
  READ_WINDOW
) as unknown as ReadSpec;

export const withSearchWindow =
  createSendScriptMessage<{ results: unknown[] }>(SEARCH_WINDOW);

export const withDetectFrameworkVersions = createSendScriptMessage<
  FrameworkMeta[]
>(DETECT_FRAMEWORK_VERSIONS);
