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

import { MessageContext, SerializedError } from "@/core";

export class ValidationError extends Error {
  errors: unknown;

  constructor(message: string, errors: unknown) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Based class for "Error" of cancelling out of a flow that's in progress
 */
export class CancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancelError";
  }
}

/**
 * Base class for Errors arising from business logic in the brick, not the PixieBrix application itself.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class PropError extends Error {
  public readonly blockId: string;
  public readonly prop: string;
  public readonly value: unknown;

  constructor(message: string, blockId: string, prop: string, value: unknown) {
    super(message);
    this.name = "PropError";
    this.blockId = blockId;
    this.prop = prop;
    this.value = value;
  }
}

/**
 * Wrap an error with some additional context about where the error originated.
 */
export class ContextError extends Error {
  public readonly cause?: Error;
  public readonly context?: MessageContext;

  constructor(cause: Error, context?: MessageContext, message?: string) {
    super(cause.message ?? message);
    this.name = "ContextError";
    this.cause = cause;
    this.context = context;
  }
}

/**
 * Returns true iff the root cause of the error was a CancelError.
 * @param err the error object
 */
export function hasCancelRootCause(error: Error | SerializedError): boolean {
  if (typeof error !== "object") {
    return false;
  } else if (error instanceof CancelError || error.name === "CancelError") {
    return true;
  } else if (error instanceof ContextError) {
    return hasCancelRootCause(error.cause);
  }
  return false;
}

/**
 * Returns true iff the root cause of the error was a BusinessError.
 * @param err the error object
 */
export function hasBusinessRootCause(error: Error | SerializedError): boolean {
  if (typeof error !== "object") {
    return false;
  } else if (error instanceof BusinessError || error.name === "BusinessError") {
    return true;
  } else if (error instanceof ContextError) {
    return hasCancelRootCause(error.cause);
  }
  return false;
}

const CONNECTION_ERROR_PATTERNS = [
  "Could not establish connection. Receiving end does not exist.",
  "Extension context invalidated",
];

function testConnectionErrorPatterns(message: string): boolean {
  if (typeof message !== "string") {
    return;
  }
  for (const pattern of CONNECTION_ERROR_PATTERNS) {
    if ((message ?? "").includes(pattern)) {
      return true;
    }
  }
  return false;
}

export function isConnectionError(
  event: ErrorEvent | PromiseRejectionEvent | unknown
): boolean {
  if (typeof event === "string") {
    return testConnectionErrorPatterns(event);
  } else if (event != null && typeof event === "object") {
    if ("reason" in event) {
      return testConnectionErrorPatterns((event as { reason: string }).reason);
    } else if ("message" in event) {
      return testConnectionErrorPatterns(
        (event as { message: string }).message
      );
    }
  }
  return false;
}
