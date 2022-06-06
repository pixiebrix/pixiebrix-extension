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

/**
 * @file ONLY KEEP ACTUAL ERRORS IN HERE.
 * Functions go in errorHelpers.ts
 * This helps avoids circular references.
 */

import { MessageContext } from "@/core";
import { getErrorMessage } from "@/errors/errorHelpers";

/**
 * Base class for connection errors between browser extension components
 */
export class ConnectionError extends Error {
  override name = "ConnectionError";
}

/**
 * Error indicating that client made an unauthenticated request to a PixieBrix API that requires authentication.
 *
 * NOTE: do not throw this error for calls where the token is incorrect
 *
 * This indicates an error in the PixieBrix code, of either:
 * - The endpoint is enforcing authentication when it should (e.g., it should return an empty response for
 * unauthenticated users, or
 * - The client should not make the call if the extensions is not linked
 */
export class EndpointAuthError extends Error {
  override name = "EndpointAuthError";
  readonly url: string;

  constructor(url: string) {
    super(`API endpoint requires authentication: ${url}`);
    this.url = url;
  }
}

/**
 * Error indicating the client performed a suspicious operation
 */
export class SuspiciousOperationError extends Error {
  override name = "SuspiciousOperationError";
}

/**
 * Error indicating the extension is not linked to the PixieBrix API
 */
export class ExtensionNotLinkedError extends Error {
  override name = "ExtensionNotLinkedError";
  override message = "Extension not linked to PixieBrix server";
}

type ContextErrorDetails = ErrorOptions & {
  context?: MessageContext;
};

/**
 * Wrap an error with some additional context about where the error originated.
 */
export class ContextError extends Error {
  override name = "ContextError";

  public readonly context?: MessageContext;

  constructor(message: string, { cause, context }: ContextErrorDetails) {
    super(getErrorMessage(cause, message), { cause });
    this.context = context;
  }
}

export class PromiseCancelled extends Error {
  override name = "PromiseCancelled";

  constructor(message?: string, options?: ErrorOptions) {
    super(message ?? "Promise was cancelled", options);
  }
}

export class IncompatibleServiceError extends SuspiciousOperationError {
  override name = "IncompatibleServiceError";
}
