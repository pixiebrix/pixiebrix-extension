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

import { deserializeError, ErrorObject } from "serialize-error";
import { isObject, matchesAnyPattern, smartAppendPeriod } from "@/utils";
import safeJsonStringify from "json-stringify-safe";
import { truncate } from "lodash";
import type { ContextError } from "@/errors/genericErrors";
import {
  isAxiosError,
  selectNetworkErrorMessage,
  selectServerErrorMessage,
} from "@/errors/networkErrorHelpers";
import { ValidationError } from "yup";

// From "webext-messenger". Cannot import because the webextension polyfill can only run in an extension context
// TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/3641
const errorTargetClosedEarly =
  "The target was closed before receiving a response";
const errorTabDoesntExist = "The tab doesn't exist";

const DEFAULT_ERROR_MESSAGE = "Unknown error";

export const JQUERY_INVALID_SELECTOR_ERROR =
  "Syntax error, unrecognized expression: ";

export const NO_TARGET_FOUND_CONNECTION_ERROR =
  "Could not establish connection. Receiving end does not exist.";
/** Browser Messenger API error message patterns */
export const CONNECTION_ERROR_MESSAGES = [
  NO_TARGET_FOUND_CONNECTION_ERROR,
  "Extension context invalidated.",
];

/**
 * Errors to ignore unless they've caused extension point install or brick execution to fail.
 *
 * Can be provided as an exact string, or regex.
 *
 * Similar to Rollbar: https://docs.rollbar.com/docs/javascript/#section-ignoring-specific-exception-messages, but
 * more strict on string matching.
 *
 * @see matchesAnyPattern
 */
export const IGNORED_ERROR_PATTERNS = [
  "ResizeObserver loop limit exceeded",
  "Promise was cancelled",
  "Uncaught Error: PixieBrix contentScript already installed",
  "The frame was removed.",
  /No frame with id \d+ in tab \d+/,
  /^No tab with id/,
  "The tab was closed.",
  errorTabDoesntExist,
  errorTargetClosedEarly,
  ...CONNECTION_ERROR_MESSAGES,
];

export function isErrorObject(error: unknown): error is ErrorObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a type guard function and it uses ?.
  return typeof (error as any)?.message === "string";
}

export function isContextError(error: unknown): error is ContextError {
  return isErrorObject(error) && error.name === "ContextError";
}

export function isSpecificError<
  ErrorType extends new (...args: unknown[]) => Error
>(error: unknown, errorType: ErrorType): error is InstanceType<ErrorType> {
  // Catch 2 common error subclass groups. Necessary until we drop support for serialized errors:
  // https://github.com/sindresorhus/serialize-error/issues/72
  if (errorType.name === "ClientRequestError") {
    return isClientRequestError(error);
  }

  if (errorType.name === "BusinessError") {
    return isBusinessError(error);
  }

  return isErrorObject(error) && error.name === errorType.name;
}

export function selectSpecificError<
  ErrorType extends new (...args: unknown[]) => Error
>(error: unknown, errorType: ErrorType): InstanceType<ErrorType> | null {
  if (!isObject(error)) {
    return null;
  }

  if (isSpecificError(error, errorType)) {
    return error;
  }

  return selectSpecificError(error.cause, errorType);
}

export function hasSpecificErrorCause<
  ErrorType extends new (...args: unknown[]) => Error
>(error: unknown, errorType: ErrorType): boolean {
  return Boolean(selectSpecificError(error, errorType));
}

// List all BusinessError subclasses as text:
// - to avoid circular reference issues
// - because not all of our errors can be deserialized with the right class:
//   https://github.com/sindresorhus/serialize-error/issues/72
const BUSINESS_ERROR_NAMES = new Set([
  "PropError",
  "BusinessError",
  "CancelError",
  "NoRendererError",
  "NoElementsFoundError",
  "MultipleElementsFoundError",
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
  "InvalidTemplateError",
  "InvalidSelectorError",
]);

export function isBusinessError(error: unknown): boolean {
  return isErrorObject(error) && BUSINESS_ERROR_NAMES.has(error.name);
}

// List all ClientRequestError subclasses as text:
// - because not all of our errors can be deserialized with the right class:
//   https://github.com/sindresorhus/serialize-error/issues/72
const CLIENT_REQUEST_ERROR_NAMES = new Set([
  "ClientRequestError",
  "RemoteServiceError",
  "ClientNetworkPermissionError",
  "ClientNetworkError",
]);

/**
 * Returns true if the error was a ClientRequestError
 * @see CLIENT_REQUEST_ERROR_NAMES
 */
export function isClientRequestError(error: unknown): boolean {
  return isErrorObject(error) && CLIENT_REQUEST_ERROR_NAMES.has(error.name);
}

/**
 * Return true if the proximate cause of event is a messaging error.
 *
 * NOTE: does not recursively identify the root cause of the error.
 */
export function isConnectionError(possibleError: unknown): boolean {
  return matchesAnyPattern(
    getErrorMessage(possibleError),
    CONNECTION_ERROR_MESSAGES
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

  const networkErrorMessage = selectNetworkErrorMessage(error);
  if (networkErrorMessage != null) {
    return networkErrorMessage;
  }

  if (isAxiosError(error)) {
    // The case when server response is empty handled by the selectNetworkErrorMessage above.
    const serverMessage = selectServerErrorMessage(error.response);
    if (serverMessage) {
      return String(serverMessage);
    }
  }

  if (error instanceof ValidationError) {
    return error.errors.join(". ");
  }

  return String(selectError(error).message ?? defaultMessage);
}

export function getErrorMessageWithCauses(
  error: unknown,
  defaultMessage = DEFAULT_ERROR_MESSAGE
): string {
  if (isErrorObject(error) && error.cause) {
    return getErrorCauseList(error)
      .map((error) => smartAppendPeriod(getErrorMessage(error)))
      .join("\n");
  }

  // Handle cause-less messages more simply, they don't need to end with a period.
  return getErrorMessage(error, defaultMessage);
}

/***
 * Return chain of error causes (including the top-level error)
 */
export function getErrorCauseList(error: unknown): unknown[] {
  const errors = [];

  while (error != null) {
    errors.push(error);
    error = (error as Error)?.cause;
  }

  return errors;
}

/**
 * Handle ErrorEvents, i.e., generated from window.onerror
 * @param event the error event
 */
export function selectErrorFromEvent(event: ErrorEvent): Error {
  // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
  // https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent

  // ErrorEvents have some information about the location of the error, so we use it as a single-level stack.
  // The format follows Chrome’s. `unknown` is the function name
  const stackFactory = (message: string) =>
    `Error: ${message}\n    at unknown (${event.filename}:${event.lineno}:${event.colno})`;

  if (event.error) {
    // `selectError` will always return an Error. If event.error isn't an Error instance, it will wrap it in an error
    // instance, but that Error instance will have an uninformative stack. (The stack will be the stack of the call
    // to selectError, which will be our error handling code). Therefore, if the original event error didn't have
    // a stack, create a stack for it from the event.
    const error = selectError(event.error);
    if (event.error.stack == null) {
      error.stack = stackFactory(error.message);
    }

    return error;
  }

  // WARNING: don't prefix the error message, e.g., with "Synchronous error:" because that breaks
  // message-based error filtering via IGNORED_ERROR_PATTERNS
  // Oddly, if you pass null to ErrorEvent's constructor, it stringifies it (at least on Node)
  const message =
    event.message && event.message !== "null"
      ? String(event.message)
      : "Unknown error event";
  const error = new Error(message);
  error.stack = stackFactory(message);

  return error;
}

/**
 * Handle unhandled promise rejections
 * @param event the promise rejection event
 */
export function selectErrorFromRejectionEvent(
  event: PromiseRejectionEvent
): Error {
  // WARNING: don't prefix the error message, e.g., with "Asynchronous error:" because that breaks
  // message-based error filtering via IGNORED_ERROR_PATTERNS
  if (typeof event.reason === "string" || event.reason == null) {
    return new Error(event.reason ?? "Unknown promise rejection");
  }

  return selectError(event.reason);
}

/**
 * Finds or creates an Error starting from strings or real Errors.
 *
 * The result is suitable for passing to Rollbar (which treats Errors and objects differently.)
 */
export function selectError(originalError: unknown): Error {
  // Be defensive here for ErrorEvent. In practice, this method will only be called with errors (as opposed to events,
  // though.) See reportUncaughtErrors
  if (originalError instanceof ErrorEvent) {
    return selectErrorFromEvent(originalError);
  }

  // Be defensive here for PromiseRejectionEvent. In practice, this method will only be called with errors (as opposed
  // to events, though.) See reportUncaughtErrors
  if (originalError instanceof PromiseRejectionEvent) {
    return selectErrorFromRejectionEvent(originalError);
  }

  if (originalError instanceof Error) {
    return originalError;
  }

  if (isErrorObject(originalError)) {
    // RTK has to store serialized error, so we can end up here (e.g. the error is thrown because of a call to unwrap)
    return deserializeError(originalError);
  }

  console.warn("A non-Error was thrown", {
    error: originalError,
  });

  // Wrap error if an unknown primitive or object
  // e.g. `throw 'Error string message'`, which should never be written
  const errorMessage = isObject(originalError)
    ? // Use safeJsonStringify vs. JSON.stringify because it handles circular references
      safeJsonStringify(originalError)
    : String(originalError);

  // Truncate error message in case it's an excessively-long JSON string
  return new Error(truncate(errorMessage, { length: 2000 }));
}
