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

import { SerializedError } from "@/core";
import { serializeError } from "serialize-error";

// eslint-disable-next-line @typescript-eslint/ban-types
export type SerializableResponse = boolean | string | number | object;

interface Meta {
  nonce?: string;
}

export interface RemoteProcedureCallRequest<TMeta extends Meta = Meta> {
  type: string;
  meta?: TMeta;
  payload: unknown[];
}

export type HandlerOptions = {
  asyncResponse?: boolean;
};

export type Handler = (...args: unknown[]) => SerializableResponse;

export type HandlerEntry = {
  handler: Handler;
  options: HandlerOptions;
};

interface ErrorResponse {
  $$error: SerializedError;
}

export function isNotification(
  options: HandlerOptions = { asyncResponse: true }
): boolean {
  return !(options?.asyncResponse ?? true);
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
