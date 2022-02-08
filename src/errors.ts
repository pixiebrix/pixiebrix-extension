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

import { MessageContext, SerializedError } from "@/core";
import { deserializeError, ErrorObject, serializeError } from "serialize-error";
import { AxiosError } from "axios";
import { isObject } from "@/utils";
import { recordError } from "@/background/messenger/api";

const DEFAULT_ERROR_MESSAGE = "Unknown error";

export const IGNORED_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "Promise was cancelled",
  "Uncaught Error: PixieBrix contentScript already installed",
];

export class ValidationError extends Error {
  errors: unknown;

  constructor(message: string, errors: unknown) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Base class for connection errors between browser extension components
 */
export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectionError";
  }
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
  readonly url: string;

  constructor(url: string) {
    super(`API endpoint requires authentication: ${url}`);
    this.name = "EndpointAuthError";
    this.url = url;
  }
}

/**
 * Error indicating the client performed a suspicious operation
 */
export class SuspiciousOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuspiciousOperationError";
  }
}

/**
 * Error indicating the extension is not properly linked to the PixieBrix API.
 */
export class ExtensionNotLinkedError extends Error {
  constructor() {
    super("Extension not linked to PixieBrix server");
    this.name = "ExtensionNotLinkedError";
  }
}

/**
 * Base class for "Error" of cancelling out of a flow that's in progress
 */
export class CancelError extends Error {
  constructor(message?: string) {
    super(message ?? "User cancelled the operation");
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

export class NoElementsFoundError extends BusinessError {
  readonly selector: string;

  constructor(selector: string, message = "No elements found for selector") {
    super(message);
    this.name = "NoElementsFoundError";
    this.selector = selector;
  }
}

export class MultipleElementsFoundError extends BusinessError {
  readonly selector: string;

  constructor(
    selector: string,
    message = "Multiple elements found for selector"
  ) {
    super(message);
    this.name = "MultipleElementsFoundError";
    this.selector = selector;
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
  public readonly cause?: Error | ErrorObject;

  public readonly context?: MessageContext;

  constructor(
    cause: Error | ErrorObject,
    context?: MessageContext,
    message?: string
  ) {
    super(getErrorMessage(cause, message));
    this.name = "ContextError";
    this.cause = cause;
    this.context = context;
  }
}

export function isErrorObject(error: unknown): error is ErrorObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a type guard function and it uses ?.
  return typeof (error as any)?.message === "string";
}

/**
 * Returns true iff the root cause of the error was a CancelError.
 * @param error the error object
 */
export function hasCancelRootCause(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  if (!isErrorObject(error)) {
    return false;
  }

  if (error instanceof CancelError || error.name === "CancelError") {
    return true;
  }

  if (error instanceof ContextError || error.name === "ContextError") {
    return hasCancelRootCause(error.cause);
  }

  return false;
}

// Manually list subclasses because the prototype chain is lost in serialization/deserialization
// See https://github.com/sindresorhus/serialize-error/issues/48
const BUSINESS_ERROR_CLASSES = [
  BusinessError,
  NoElementsFoundError,
  MultipleElementsFoundError,
];
// Name classes from other modules separately, because otherwise we'll get a circular dependency with this module
const BUSINESS_ERROR_NAMES = new Set([
  ...BUSINESS_ERROR_CLASSES.map((x) => x.name),
  "InputValidationError",
  "OutputValidationError",
  "PipelineConfigurationError",
  "MissingConfigurationError",
  "NotConfiguredError",
  "RemoteServiceError",
  "ClientNetworkPermissionError",
  "ClientNetworkError",
  "ProxiedRemoteServiceError",
  "RemoteExecutionError",
]);

/**
 * Returns true iff the root cause of the error was a BusinessError.
 * @param error the error object
 * @see BUSINESS_ERROR_CLASSES
 */
export function hasBusinessRootCause(
  error: SerializedError | unknown
): boolean {
  if (error == null) {
    return false;
  }

  if (!isErrorObject(error)) {
    return false;
  }

  for (const errorClass of BUSINESS_ERROR_CLASSES) {
    if (error instanceof errorClass) {
      return true;
    }
  }

  if (BUSINESS_ERROR_NAMES.has(error.name)) {
    return true;
  }

  if (error instanceof ContextError || error.name === "ContextError") {
    return hasBusinessRootCause(error.cause);
  }

  return false;
}

/**
 * Browser Messenger API error message patterns.
 */
const CONNECTION_ERROR_PATTERNS = [
  "Could not establish connection. Receiving end does not exist.",
  "Extension context invalidated",
];

export function isPromiseRejectionEvent(
  event: unknown
): event is PromiseRejectionEvent {
  return event && typeof event === "object" && "reason" in event;
}

// Copy of axios.isAxiosError, without risking to import the whole untreeshakeable axios library
export function isAxiosError(error: unknown): error is AxiosError {
  return isObject(error) && Boolean(error.isAxiosError);
}

/**
 * Return true if the proximate cause of event is an messaging error.
 *
 * NOTE: does not recursively identify the root cause of the error.
 */
export function isConnectionError(possibleError: unknown): boolean {
  const message = getErrorMessage(possibleError);
  return CONNECTION_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Some pages are off-limits to extension. This function can find out if an error is due to this limitation.
 *
 * Example error messages:
 * - Cannot access a chrome:// URL
 * - Cannot access a chrome-extension:// URL of different extension
 * - Cannot access contents of url "chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/options.html#/". Extension manifest must request permission to access this host.
 * - The extensions gallery cannot be scripted.
 */
export function isPrivatePageError(error: unknown): boolean {
  return /cannot be scripted|(chrome|about|extension):\/\//.test(
    getErrorMessage(error)
  );
}

/**
 * Return an error message corresponding to an error.
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = DEFAULT_ERROR_MESSAGE
): string {
  // Two shortcuts first
  if (!error) {
    return defaultMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  const { message = defaultMessage } = selectError(error);
  return String(message);
}

/**
 * Finds or creates an Error starting from strings, error event, or real Errors.
 *
 * The result is suitable for passing to Rollbar. (Which treats Errors and objects differently.)
 */
export function selectError(originalError: unknown): Error {
  let error: unknown = originalError;

  // Extract error from event
  if (error instanceof ErrorEvent) {
    error = error.error;
  } else if (isPromiseRejectionEvent(error)) {
    error = error.reason;
  }

  if (error instanceof Error) {
    return error;
  }

  if (isErrorObject(error)) {
    console.warn(
      "selectError encountered a serialized error. Do not pass around serialized errors",
      {
        originalError,
        error,
      }
    );

    return deserializeError(error);
  }

  console.warn("A non-Error was thrown", {
    originalError,
    error,
  });

  // Wrap error if an unknown primitive or object
  // e.g. `throw 'Error message'`, which should never be written
  return new Error(String(error));
}

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param error the error object
 * @param context optional context for error telemetry
 */

export function reportError(error: unknown, context?: MessageContext): void {
  void _reportError(error, context).catch((reportingError) => {
    console.error("An error occurred when reporting an error", {
      originalError: error,
      reportingError,
    });
  });
}

// Extracted async function to avoid turning `reportError` into an async function
// which would trigger `eslint/no-floating-promises` at every `reportError` call
export async function _reportError(
  error: unknown, // It might also be an ErrorEvent
  context?: MessageContext
): Promise<void> {
  const errorObject = selectError(error);

  // Events are already natively logged by the browser
  if (
    !(error instanceof ErrorEvent || error instanceof PromiseRejectionEvent)
  ) {
    console.error(error);
  }

  recordError(serializeError(errorObject), context, null);
}
