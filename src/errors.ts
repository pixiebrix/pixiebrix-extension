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
import { deserializeError, ErrorObject } from "serialize-error";
import { AxiosError, AxiosResponse } from "axios";
import { isObject, matchesAnyPattern } from "@/utils";
import safeJsonStringify from "json-stringify-safe";
import { isEmpty } from "lodash";
import {
  isBadRequestResponse,
  isClientErrorResponse,
  safeGuessStatusText,
} from "@/types/errorContract";

const DEFAULT_ERROR_MESSAGE = "Unknown error";

export const JQUERY_INVALID_SELECTOR_ERROR =
  "Syntax error, unrecognized expression: ";

/**
 * Base class for Errors arising from business logic in the brick, not the PixieBrix application/extension itself.
 *
 * Used for blame analysis for reporting and alerting.
 */
export class BusinessError extends Error {
  override name = "BusinessError";
}

export class PromiseCancelled extends Error {
  override name = "PromiseCancelled";
  constructor(message = "Promise was cancelled") {
    super(message);
  }
}

/**
 * Error that a registry definition is invalid
 */
export class InvalidDefinitionError extends BusinessError {
  override name = "InvalidDefinitionError";

  errors: unknown;

  constructor(message: string, errors: unknown) {
    super(message);
    this.errors = errors;
  }
}

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

/**
 * Base class for "Error" of cancelling out of a flow that's in progress
 */
export class CancelError extends BusinessError {
  override name = "CancelError";
  constructor(message?: string) {
    super(message ?? "User cancelled the operation");
  }
}

export class NoElementsFoundError extends BusinessError {
  override name = "NoElementsFoundError";
  readonly selector: string;

  constructor(selector: string, message = "No elements found for selector") {
    super(message);
    this.selector = selector;
  }
}

export class MultipleElementsFoundError extends BusinessError {
  override name = "MultipleElementsFoundError";
  readonly selector: string;

  constructor(
    selector: string,
    message = "Multiple elements found for selector"
  ) {
    super(message);
    this.selector = selector;
  }
}

export class InvalidSelectorError extends BusinessError {
  override name = "InvalidSelectorError";
  readonly selector: string;

  /**
   * @param message The error message jQuery creates, example in https://cs.github.com/jquery/jquery/blob/2525cffc42934c0d5c7aa085bc45dd6a8282e840/src/selector.js#L787
   */
  constructor(message: string, selector: string) {
    // Make the error message more specific than "Syntax error"
    super(
      "Invalid selector: " + message.replace(JQUERY_INVALID_SELECTOR_ERROR, "")
    );
    this.selector = selector;
  }
}

/**
 * An error indicating an invalid input was provided to a brick. Used for checks that cannot be performed as part
 * of JSONSchema input validation
 *
 * @see InputValidationError
 */
export class PropError extends BusinessError {
  override name = "PropError";

  public readonly blockId: string;

  public readonly prop: string;

  public readonly value: unknown;

  constructor(message: string, blockId: string, prop: string, value: unknown) {
    super(message);
    this.blockId = blockId;
    this.prop = prop;
    this.value = value;
  }
}

export class InvalidTemplateError extends BusinessError {
  override name = "InvalidTemplateError";
  readonly template: string;

  constructor(message: string, template: string) {
    super(`Template rendering error: ${message}. Template: "${template}"`);

    this.template = template;
  }
}

type ContextErrorDetails = ErrorOptions & {
  context?: MessageContext;
};

/**
 * Wrap an error with some additional context about where the error originated.
 */
export class ContextError extends Error {
  override name = "ContextError";

  // Super important until https://github.com/sindresorhus/serialize-error/issues/50
  // This overrides the native property making it enumerable and thus serializable
  override cause: unknown = undefined;

  public readonly context?: MessageContext;
  constructor(message: string, { cause, context }: ContextErrorDetails) {
    super(getErrorMessage(cause, message));
    this.context = context;

    // Required until https://github.com/sindresorhus/serialize-error/issues/50
    this.cause = cause;
  }
}

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

export function getRootCause(error: ErrorObject): ErrorObject {
  if (isContextError(error) && error.cause != null) {
    return getRootCause(error.cause as ErrorObject);
  }

  return error;
}

// Manually list subclasses because the prototype chain is lost in serialization/deserialization
// See https://github.com/sindresorhus/serialize-error/issues/48
const BUSINESS_ERROR_CLASSES = new Set([
  BusinessError,
  NoElementsFoundError,
  MultipleElementsFoundError,
  InvalidSelectorError,
  PropError,
  InvalidTemplateError,
]);
// Name classes from other modules separately, because otherwise we'll get a circular dependency with this module
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

// Copy of axios.isAxiosError, without risking to import the whole untreeshakeable axios library
export function isAxiosError(error: unknown): error is AxiosError {
  return isObject(error) && Boolean(error.isAxiosError);
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
 * @param Response from the server. May not be null
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
 * Finds or creates an Error starting from strings, error event, or real Errors.
 *
 * The result is suitable for passing to Rollbar (which treats Errors and objects differently.)
 */
export function selectError(originalError: unknown): Error {
  // Extract thrown error from event
  const error: unknown =
    originalError instanceof ErrorEvent
      ? originalError.error
      : originalError instanceof PromiseRejectionEvent
      ? originalError.reason
      : originalError; // Or use the received object/error as is

  if (error instanceof Error) {
    return error;
  }

  if (isErrorObject(error)) {
    // RTK has to store serialized error, so we can end up here (e.g. the error is thrown because of a call to unwrap)
    return deserializeError(error);
  }

  console.warn("A non-Error was thrown", {
    originalError,
  });

  // Wrap error if an unknown primitive or object
  // e.g. `throw 'Error string message'`, which should never be written
  const errorMessage = isObject(error)
    ? // Use safeJsonStringify vs. JSON.stringify because it handles circular references
      safeJsonStringify(error)
    : String(error);

  // Refactor beware: Keep the "primitive error event wrapper" logic separate from the
  // "extract error from event" logic to avoid duplicating or missing the rest of the selectError’s logic
  if (originalError instanceof ErrorEvent) {
    const syncErrorMessage = `Synchronous error: ${errorMessage}`;
    const errorError = new Error(syncErrorMessage);

    // ErrorEvents have some information about the location of the error, so we use it as a single-level stack.
    // The format follows Chrome’s. `unknown` is the function name
    errorError.stack = `Error: ${syncErrorMessage}\n    at unknown (${originalError.filename}:${originalError.lineno}:${originalError.colno})`;
    return errorError;
  }

  if (originalError instanceof PromiseRejectionEvent) {
    return new Error(`Asynchronous error: ${errorMessage}`);
  }

  return new Error(errorMessage);
}
