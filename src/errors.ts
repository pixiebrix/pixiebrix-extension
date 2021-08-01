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

import { MessageContext, SerializedError } from "@/core";
import { ErrorObject } from "serialize-error";
import { AxiosError } from "axios";

const DEFAULT_ERROR_MESSAGE = "Unknown error";

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
 * Base class for "Error" of cancelling out of a flow that's in progress
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
  public readonly cause?: Error;

  public readonly context?: MessageContext;

  constructor(cause: Error, context?: MessageContext, message?: string) {
    super(cause.message ?? message);
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
]);

/**
 * Returns true iff the root cause of the error was a BusinessError.
 * @param error the error object
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

export function isPromiseRejectionEvent(
  event: unknown
): event is PromiseRejectionEvent {
  return typeof event === "object" && "reason" in event;
}

export function selectPromiseRejectionError(
  event: PromiseRejectionEvent
): Error {
  // Convert the project rejection to an error instance
  if (event.reason instanceof Error) {
    return event.reason;
  }

  if (typeof event.reason === "string") {
    return new Error(event.reason);
  }

  return new Error(event.reason?.message ?? "Uncaught error in promise");
}

/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
 */
export function isErrorEvent(event: unknown): event is ErrorEvent {
  // Need to check enough of the structure to make sure it's not mistaken for an error
  return typeof event === "object" && "error" in event && "message" in event;
}

/**
 * Return true iff the value is an AxiosError.
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === "object" && (error as AxiosError).isAxiosError;
}

/**
 * Return true iff the value is an AxiosError corresponding to a HTTP_400_BAD_REQUEST.
 */
export function isBadRequestError(
  error: unknown
): error is AxiosError & { response: { status: 400 } } {
  return isAxiosError(error) && error.response.status === 400;
}

/**
 * Return true if the proximate cause of event is an messaging or port error.
 *
 * NOTE: does not recursively identify the root cause of the error.
 */
export function isConnectionError(
  event: ErrorEvent | PromiseRejectionEvent | unknown
): boolean {
  if (typeof event === "string") {
    return testConnectionErrorPatterns(event);
  }

  if (event instanceof ConnectionError) {
    return true;
  }

  if (event != null && typeof event === "object") {
    if (isPromiseRejectionEvent(event)) {
      return (
        event.reason instanceof ConnectionError ||
        testConnectionErrorPatterns(event.reason)
      );
    }

    if (isErrorEvent(event)) {
      return testConnectionErrorPatterns(event.message);
    }
  }

  return false;
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
export function getErrorMessage(error: unknown): string {
  if (isErrorObject(error)) {
    // `error.message` known to be of type string, so don't need to default it
    return error.message;
  }

  return String(error ?? DEFAULT_ERROR_MESSAGE);
}

/**
 * Returns the error corresponding to error-like objects
 *
 * Current handled:
 * - unhandled promise rejections
 * - error events
 */
export function selectError(error: unknown): unknown {
  if (error instanceof Error) {
    // Check first to return directly if possible (in case our other type guards match too much)
    return error;
  }

  if (isPromiseRejectionEvent(error)) {
    return selectPromiseRejectionError(error);
  }

  if (isErrorEvent(error)) {
    return error.error;
  }

  return error;
}
