/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
  deserializeError,
  isErrorLike,
  type ErrorObject,
} from "serialize-error";
import safeJsonStringify from "json-stringify-safe";
import { isEmpty, truncate, uniq } from "lodash";
import { selectNetworkErrorMessage } from "@/errors/networkErrorHelpers";
import { type MessageContext } from "@/types/loggerTypes";
import { matchesAnyPattern, smartAppendPeriod } from "@/utils/stringUtils";
import { isObject } from "@/utils/objectUtils";
import {
  isSchemaValidationError,
  type SchemaValidationError,
} from "@/bricks/errors";
import { type SetOptional, type SetRequired } from "type-fest";
import {
  CONTEXT_INVALIDATED_ERROR,
  ERROR_TAB_DOES_NOT_EXIST,
  ERROR_TARGET_CLOSED_EARLY,
} from "@/errors/knownErrorMessages";
import { BusinessError } from "./businessErrors";

const DEFAULT_ERROR_MESSAGE = "Unknown error";

/**
 * Errors to ignore unless they've caused extension point install or brick execution to fail.
 *
 * Can be provided as an exact string, or regex.
 *
 * Originally designed to be similar to Rollbar (https://docs.rollbar.com/docs/javascript/#section-ignoring-specific-exception-messages)
 * but more strict on string matching.
 *
 * @see matchesAnyPattern
 */
const IGNORED_ERROR_PATTERNS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Network Error",
  "Promise was cancelled",
  "Action cancelled",
  "User cancelled the action",
  "Uncaught Error: PixieBrix contentScript already installed",
  "Could not establish connection. Receiving end does not exist.",
  "The frame was removed.",
  /No frame with id \d+ in tab \d+/,
  /^No tab with id/,
  "The tab was closed.",
  /RECORD_ERROR/, // Reporting errors cause loops https://github.com/pixiebrix/pixiebrix-extension/issues/7430
  ERROR_TAB_DOES_NOT_EXIST,
  ERROR_TARGET_CLOSED_EARLY,
  CONTEXT_INVALIDATED_ERROR,
];

export function shouldErrorBeIgnored(
  possibleError: unknown,
  context: MessageContext = {},
): boolean {
  const { pageName, ...extensionContext } = context;
  return (
    // For noisy errors, don't record/submit telemetry unless the error prevented an extension point
    // from being installed or an extension to fail. (In that case, we'd have some context about the error).
    isEmpty(extensionContext) &&
    matchesAnyPattern(getErrorMessage(possibleError), IGNORED_ERROR_PATTERNS)
  );
}

/** Add a global listener for uncaught errors and promise rejections */
export function onUncaughtError(handler: (error: Error) => void): void {
  const listener = (errorEvent: ErrorEvent | PromiseRejectionEvent): void => {
    handler(selectErrorFromEvent(errorEvent));
  };

  self.addEventListener("error", listener);
  self.addEventListener("unhandledrejection", listener);
}

export function isErrorObject(
  error: unknown,
): error is SetRequired<ErrorObject, "name" | "message"> {
  // We should probably just use ErrorLike everywhere, but it requires changing a lot of code
  return isErrorLike(error);
}

export function isSpecificError<
  ErrorType extends new (...args: unknown[]) => Error,
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

/** @internal */
export function isCustomAggregateError(
  error: unknown,
): error is ErrorObject & { errors: unknown[] } {
  return (
    isErrorObject(error) && "errors" in error && Array.isArray(error.errors)
  );
}

export function selectSpecificError<
  ErrorType extends new (...args: unknown[]) => Error,
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
 * Follows the `Error#cause` trail until the end or returns the supplied object as is.
 *
 * @deprecated Prefer `hasSpecificErrorCause` or `getErrorMessageWithCauses` if you're displaying it to the user
 */
export function getRootCause(error: unknown): unknown {
  while (isErrorObject(error) && error.cause) {
    error = error.cause;
  }

  return error;
}

export function hasSpecificErrorCause<
  ErrorType extends new (...args: unknown[]) => Error,
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
  "InteractiveLoginRequiredError",
  "RequestSupersededError",
  "SubmitPanelAction",
  "AbortPanelAction",
  "ClosePanelAction",
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

function isBusinessError(error: unknown): boolean {
  return isErrorObject(error) && BUSINESS_ERROR_NAMES.has(error.name);
}

/** @internal */
export function formatSchemaValidationMessage(
  error: SetOptional<
    SchemaValidationError["errors"][number],
    "keywordLocation"
  >,
) {
  const { keywordLocation, error: validationError } = error;
  return `${keywordLocation ? `${keywordLocation}: ` : ""}${
    validationError ?? ""
  }`;
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
function isClientRequestError(error: unknown): boolean {
  return isErrorObject(error) && CLIENT_REQUEST_ERROR_NAMES.has(error.name);
}

/**
 * Return an error message corresponding to an error.
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = DEFAULT_ERROR_MESSAGE,
): string {
  if (!error) {
    return defaultMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  const requestErrorMessage = selectNetworkErrorMessage(error);
  if (requestErrorMessage) {
    return requestErrorMessage;
  }

  // In most cases, prefer the error message property over all. We don't want to override
  // the original error message unless necessary.
  if (isObject(error) && error.message) {
    return error.message as string;
  }

  if (isSchemaValidationError(error)) {
    const firstError = error.errors[0];
    const formattedMessage =
      firstError && formatSchemaValidationMessage(firstError);

    if (formattedMessage) {
      return formattedMessage;
    }
  }

  if (isCustomAggregateError(error)) {
    const aggregatedMessage = error.errors
      .filter((x) => typeof x === "string")
      .join(". ");

    if (aggregatedMessage) {
      return aggregatedMessage;
    }
  }

  return String(selectError(error).message || defaultMessage);
}

/**
 * Return a single error message for an error with possibly nested causes.
 *
 * Excludes duplicate error messages.
 *
 * @param error the top-level error
 * @param defaultMessage the default message to return if no messages are found
 */
export function getErrorMessageWithCauses(
  error: unknown,
  defaultMessage = DEFAULT_ERROR_MESSAGE,
): string {
  if (isErrorObject(error) && error.cause) {
    // Currently excluding all duplicates. Might instead consider only excluding adjacent duplicates.
    return uniq(
      getErrorCauseList(error).map((error) =>
        smartAppendPeriod(getErrorMessage(error)),
      ),
    ).join("\n");
  }

  // Handle cause-less messages more simply, they don't need to end with a period.
  return getErrorMessage(error, defaultMessage);
}

/**
 * Return chain of error causes (including the top-level error)
 */
function getErrorCauseList(error: unknown): unknown[] {
  const errors = [];

  while (error != null) {
    errors.push(error);
    error = (error as Error)?.cause;
  }

  return errors;
}

/**
 * Extracts or generates error from ErrorEvent
 * @deprecated use the generic `selectErrorFromEvent`
 * @internal
 */
export function selectErrorFromErrorEvent(event: ErrorEvent): Error {
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
 * Extracts error from PromiseRejectionEvent
 * @deprecated use the generic `selectErrorFromEvent`
 * @internal
 */
export function selectErrorFromRejectionEvent(
  event: PromiseRejectionEvent,
): Error {
  // WARNING: don't prefix the error message, e.g., with "Asynchronous error:" because that breaks
  // message-based error filtering via IGNORED_ERROR_PATTERNS
  if (typeof event.reason === "string" || event.reason == null) {
    return new Error(String(event.reason ?? "Unknown promise rejection"));
  }

  return selectError(event.reason);
}

/**
 * Extracts error from ErrorEvent and PromiseRejectionEvent
 */
function selectErrorFromEvent(
  event: ErrorEvent | PromiseRejectionEvent,
): Error {
  return event instanceof PromiseRejectionEvent
    ? selectErrorFromRejectionEvent(event)
    : selectErrorFromErrorEvent(event);
}

/**
 * Finds or creates an Error starting from strings or real Errors.
 *
 * The result is suitable for passing to Application error telemetry. Note, Rollbar treats Errors and objects differently.
 */
export function selectError(originalError: unknown): Error {
  // Be defensive here for ErrorEvent. In practice, this method will only be called with errors (as opposed to events,
  // though.) See reportUncaughtErrors
  if (originalError instanceof ErrorEvent) {
    return selectErrorFromErrorEvent(originalError);
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

/**
 * Basic Error-like type to be used only when ErrorObject is too complex
 * @see SerializedError
 *  todo: We can possibly unify these two types
 */
export type SimpleErrorObject = {
  name?: string;
  message?: string;
  stack?: string;
};

/**
 * Change the type of error while preserving existing properties like message, stack and cause
 * @param error the error to swap
 * @param ErrorConstructor the new error constructor, it only works if it doesn't
 * have additional required properties and logic in the constructor
 * @internal
 */
export function replaceErrorType(
  error: unknown,
  ErrorConstructor: new (message: string) => Error,
): Error {
  const newError = new ErrorConstructor(getErrorMessage(error));
  if (error instanceof Error) {
    // Preserve the original error's enumerable properties
    Object.assign(newError, error);

    // Attach known props (they're non-enumerable)
    newError.stack = error.stack;
    newError.cause = error.cause;
  }

  return newError;
}

/**
 * Call function and replace the type of thrown errors with the provided ErrorConstructor
 * @param ErrorConstructor the new error constructor, it only works if it doesn't
 * have additional required properties and logic in the constructor
 * @param fn the function to call and replace any thrown errors
 * @internal
 */
export function replaceThrownErrors<T>(
  ErrorConstructor: new (message: string) => Error,
  fn: () => T,
): T {
  try {
    const returnValue = fn();
    if (isObject(returnValue) && typeof returnValue.catch === "function") {
      // eslint-disable-next-line promise/prefer-await-to-then -- More readable with .catch()
      return returnValue.catch((error: unknown) => {
        throw replaceErrorType(error, ErrorConstructor);
      }) as T;
    }

    return returnValue;
  } catch (error) {
    throw replaceErrorType(error, ErrorConstructor);
  }
}

/**
 * Call function and convert all thrown errors to BusinessErrors
 */
export function withBusinessError<T>(fn: () => T): T {
  return replaceThrownErrors(BusinessError, fn);
}
