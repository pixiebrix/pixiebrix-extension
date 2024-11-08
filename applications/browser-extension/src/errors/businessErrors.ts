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

import { truncate } from "lodash";
import { type AxiosResponse } from "axios";
import { type RegistryId } from "@/types/registryTypes";
import { JQUERY_INVALID_SELECTOR_ERROR } from "./knownErrorMessages";

/**
 * @file ONLY KEEP ACTUAL ERRORS IN HERE.
 * Functions go in errorHelpers.ts
 * This helps avoids circular references.
 */

/**
 * Base class for Errors arising from user-defined logic/inputs, not PixieBrix itself.
 *
 * Where possible, use a more specific subclass of BusinessError. Some subclasses have an enriched error view in
 * the mod log viewer.
 *
 * "Business" Errors vs. "Application" Errors:
 * - Application errors (subclasses of Error) indicate a bug or failure in PixieBrix itself, which must be addressed
 *   by the PixieBrix team
 * - Business errors indicate a problem with user-defined content or 3rd party services. They must be addressed
 *   by the customer
 * - Business errors are not reported to Datadog, but are reported to the PixieBrix error telemetry service. See
 *   recordError and reportToErrorService.
 *
 * Throw a BusinessError (or a BusinessError subclass) to indicate:
 * - A logic error in a package definition
 * - A logic error in a brick configuration (i.e., a mod definition, or custom brick definition)
 * - A runtime error due to user-provided values (e.g., bad configuration options)
 * - A failed 3rd-party API call
 *
 * Use an Application error (i.e., Error subclass) to indicate:
 * - A bug in PixieBrix itself
 * - A failed API call to a PixieBrix service (e.g., fetching packages)
 *
 * Other guidelines:
 * - Throw an application error for assertions that should never fail, e.g., that the function caller should have
 *   checked the precondition before calling a function. This guideline applies even if the condition is due to
 *   package definition/user input, because it represents a bug in our code.
 */
export class BusinessError extends Error {
  override name = "BusinessError";
}

/**
 * Error that a registry package definition is invalid.
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
 * Base class for "Error" of cancelling out of a flow that's in progress.
 */
export class CancelError extends BusinessError {
  override name = "CancelError";

  constructor(message?: string) {
    super(message ?? "User cancelled the operation");
  }
}

/**
 * Error that a request was superseded by another request. In practice, will be because user needs to log in.
 */
export class RequestSupersededError extends CancelError {
  override name = "RequestSupersededError";

  constructor(message?: string) {
    super(message ?? "Request superseded");
  }
}

export class NoRendererError extends BusinessError {
  override name = "NoRendererError";

  constructor(message?: string) {
    super(message ?? "No renderer brick attached");
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
    message = "Multiple elements found for selector",
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
   * @param selector The selector that was invalid
   */
  constructor(message: string, selector: string) {
    // Make the error message more specific than "Syntax error"
    super(
      "Invalid selector: " + message.replace(JQUERY_INVALID_SELECTOR_ERROR, ""),
    );
    this.selector = selector;
  }
}

/**
 * An error indicating an invalid input was provided to a brick. Used for runtime checks that cannot be performed as
 * part of JSONSchema input validation.
 *
 * Throwing PropError instead of BusinessError allows the Page Editor to show the error on the associated field
 * in the brick configuration UI.
 *
 * @see InputValidationError
 */
export class PropError extends BusinessError {
  override name = "PropError";

  public readonly blockId: RegistryId;

  public readonly prop: string;

  public readonly value: unknown;

  constructor(
    message: string,
    blockId: RegistryId,
    prop: string,
    value: unknown,
  ) {
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
    // Remove excess whitespace/newlines and truncate to ensure the message isn't too long. The main point of including
    // the template is to identify which expression generated the problem
    const normalized = truncate(template.replaceAll(/\s+/g, " ").trim(), {
      length: 32,
    });
    super(`Invalid template: ${message}. Template: "${normalized}"`);

    this.template = template;
  }
}

export class MissingConfigurationError extends BusinessError {
  override name = "MissingConfigurationError";

  serviceId: string;

  id: string;

  constructor(message: string, serviceId: string, id: string) {
    super(message);
    this.serviceId = serviceId;
    this.id = id;
  }
}

export class NotConfiguredError extends BusinessError {
  override name = "NotConfiguredError";

  serviceId: string;

  missingProperties: string[];

  constructor(
    message: string,
    serviceId: string,
    missingProperties: string[] = [],
  ) {
    super(message);
    this.serviceId = serviceId;
    this.missingProperties = missingProperties;
  }
}

export type ProxiedResponse = Pick<
  AxiosResponse,
  "data" | "status" | "statusText"
>;

/**
 * An error response from a 3rd party API via the PixieBrix proxy
 * @see RemoteServiceError
 */
export class ProxiedRemoteServiceError extends BusinessError {
  override name = "ProxiedRemoteServiceError";
  readonly response: ProxiedResponse;

  constructor(message: string, response: ProxiedResponse) {
    super(`Remote API Error: ${message}`);

    this.response = response;
  }
}
