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
import { AxiosResponse } from "axios";
import { isObject, matchesAnyPattern } from "@/utils";
import safeJsonStringify from "json-stringify-safe";
import { isEmpty, truncate } from "lodash";
import {
  isBadRequestResponse,
  isClientErrorResponse,
  safeGuessStatusText,
} from "@/types/errorContract";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { ContextError } from "@/errors/genericErrors";
import { SerializableAxiosError } from "@/errors/errorHelpers";

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
  ...CONNECTION_ERROR_MESSAGES,
];

export function isErrorObject(error: unknown): error is ErrorObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a type guard function and it uses ?.
  return typeof (error as any)?.message === "string";
}

export function isContextError(error: unknown): error is ContextError {
  return (
    error instanceof ContextError ||
    (isErrorObject(error) && error.name === "ContextError")
  );
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

  if (isContextError(error)) {
    return hasCancelRootCause(error.cause);
  }

  return false;
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

/**
 * Find the root cause
 * @deprecated Look for specific errors via selectSpecificError
 */
export function getRootCause(error: unknown): unknown {
  while (isObject(error) && error.cause != null) {
    error = error.cause;
  }

  return error;
}

// List all BusinessError subclasses as text:
// - to avoid circular reference issues
// - because not all of our errors can be deserialized with the right class:
//   https://github.com/sindresorhus/serialize-error/issues/72
const BUSINESS_ERROR_NAMES = new Set([
  "PropError",
  "BusinessError",
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

/**
 * Returns true iff the root cause of the error was a BusinessError.
 * @see BUSINESS_ERROR_NAMES
 * @deprecated Prefer `selectSpecificError(error, BusinessError)`
 */
export function hasBusinessRootCause(error: unknown): boolean {
  return Boolean(selectSpecificError(error, BusinessError));
}

export function isBusinessError(error: unknown): boolean {
  return isErrorObject(error) && BUSINESS_ERROR_NAMES.has(error.name);
}

// List all ClientRequestError subclasses as text:
// - because not all of our errors can be deserialized with the right class:
//   https://github.com/sindresorhus/serialize-error/issues/72
const CLIENT_REQUEST_ERROR_NAMES = new Set([
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

// Copy of axios.isAxiosError, without risking to import the whole untreeshakeable axios library
export function isAxiosError(error: unknown): error is SerializableAxiosError {
  if (isObject(error) && Boolean(error.isAxiosError)) {
    // Axios offers its own serialization method, but it doesn't include the response.
    // By deleting toJSON, the serialize-error library will use its default serialization
    delete error.toJSON;
    return true;
  }

  return false;
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

export const NO_INTERNET_MESSAGE =
  "No response received. You are not connected to the internet.";

export const NO_RESPONSE_MESSAGE =
  "No response received. Your browser may have blocked the request. See https://docs.pixiebrix.com/network-errors for troubleshooting information";

function selectNetworkErrorMessage(error: unknown): string | null {
  if (
    (isAxiosError(error) && error.response == null) ||
    (typeof (error as any).message === "string" &&
      (error as { message: string }).message.toLowerCase() === "network error")
  ) {
    if (!navigator.onLine) {
      return NO_INTERNET_MESSAGE;
    }

    return NO_RESPONSE_MESSAGE;
  }

  return null;
}

/**
 * Heuristically select the most user-friendly error message for an Axios response.
 *
 * Tries to handle:
 * - Errors produced by our backed (Django Rest Framework style)
 * - Common response body patterns of other APIs
 * - HTTP standards in statusText/status
 *
 * enrichBusinessRequestError is a related method which wraps an AxiosError in an Error subclass that encodes information
 * about why the request failed.
 *
 * @param response Response from the server. Must not be null
 *
 * @deprecated DO NOT CALL DIRECTLY. Call getErrorMessage
 * @see getErrorMessage
 * @see enrichBusinessRequestError
 */
function selectServerErrorMessage(response: AxiosResponse): string | null {
  if (response == null) {
    throw new Error("Expected response to be defined");
  }

  // For examples of DRF errors, see the pixiebrix-app repository:
  // http://github.com/pixiebrix/pixiebrix-app/blob/5ef1e4e414be6485fae999440b69f2b6da993668/api/tests/test_errors.py#L15-L15

  // Handle 400 responses created by DRF serializers
  if (isBadRequestResponse(response)) {
    const data = Array.isArray(response.data)
      ? response.data.find((x) => isEmpty(x))
      : response.data;

    // Prefer object-level errors
    if (data?.non_field_errors) {
      return data.non_field_errors[0];
    }

    // Take an arbitrary field
    const fieldMessages = Object.values(data)[0];

    // Take an arbitrary message
    return fieldMessages[0];
  }

  // Handle 4XX responses created by DRF
  if (isClientErrorResponse(response)) {
    return response.data.detail;
  }

  // Handle other likely API JSON body response formats
  // Some servers produce an HTML document for server responses even if you requested JSON. Check the response headers
  // to avoid dumping JSON to the user
  if (
    typeof response.data === "string" &&
    ["text/plain", "application/json"].includes(
      response.headers["content-type"]
    )
  ) {
    return response.data;
  }

  // Handle common keys from other APIs
  for (const messageKey of ["message", "reason"]) {
    // eslint-disable-next-line security/detect-object-injection -- constant defined above
    const message = response.data?.[messageKey];
    if (typeof message === "string" && !isEmpty(message)) {
      return message;
    }
  }

  // Otherwise, rely on HTTP REST statusText/status
  if (!isEmpty(response.statusText)) {
    return response.statusText;
  }

  return safeGuessStatusText(response.status);
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

  return String(selectError(error).message ?? defaultMessage);
}

/**
 * Handle ErrorEvents, i.e., generated from window.onerror
 * @param event the error event
 */
function selectErrorFromEvent(event: ErrorEvent): Error {
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
function selectErrorFromRejectionEvent(event: PromiseRejectionEvent): Error {
  // WARNING: don't prefix the error message, e.g., with "Asynchronous error:" because that breaks
  // message-based error filtering via IGNORED_ERROR_PATTERNS
  if (typeof event.reason === "string" || event.reason == null) {
    return new Error(event.reason ?? "Unknown promise rejection");
  }

  return selectError(event.reason);
}

/**
 * Finds or creates an Error starting from strings, error event, or real Errors.
 *
 * The result is suitable for passing to Rollbar (which treats Errors and objects differently.)
 */
export function selectError(originalError: unknown): Error {
  if (originalError instanceof ErrorEvent) {
    return selectErrorFromEvent(originalError);
  }

  if (originalError instanceof PromiseRejectionEvent) {
    return selectErrorFromRejectionEvent(originalError);
  }

  const error = originalError;

  if (error instanceof Error) {
    return error;
  }

  if (isErrorObject(error)) {
    // RTK has to store serialized error, so we can end up here (e.g. the error is thrown because of a call to unwrap)
    return deserializeError(error);
  }

  console.warn("A non-Error was thrown", {
    error,
  });

  // Wrap error if an unknown primitive or object
  // e.g. `throw 'Error string message'`, which should never be written
  const errorMessage = isObject(error)
    ? // Use safeJsonStringify vs. JSON.stringify because it handles circular references
      safeJsonStringify(error)
    : String(error);

  // Truncate error message in case it's an excessively-long JSON string
  return new Error(truncate(errorMessage, { length: 2000 }));
}
