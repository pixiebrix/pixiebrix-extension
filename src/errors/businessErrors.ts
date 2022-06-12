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

import { truncate } from "lodash";
import { JQUERY_INVALID_SELECTOR_ERROR } from "@/errors/errorHelpers";
import { AxiosResponse } from "axios";

/**
 * @file ONLY KEEP ACTUAL ERRORS IN HERE.
 * Functions go in errorHelpers.ts
 * This helps avoids circular references.
 */

/**
 * Base class for Errors arising from business logic in the brick, not the PixieBrix application/extension itself.
 *
 * Used for blame analysis for reporting and alerting.
 */
export class BusinessError extends Error {
  override name = "BusinessError";
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
 * Base class for "Error" of cancelling out of a flow that's in progress
 */
export class CancelError extends BusinessError {
  override name = "CancelError";

  constructor(message?: string) {
    super(message ?? "User cancelled the operation");
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
    // Remove excess whitespace/newlines and truncate to ensure the message isn't too long. The main point of including
    // the template is to identify which expression generated the problem
    const normalized = truncate(template.replace(/\s+/g, " ").trim(), {
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

  constructor(message: string, serviceId: string, id?: string) {
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
    missingProperties?: string[]
  ) {
    super(message);
    this.serviceId = serviceId;
    this.missingProperties = missingProperties;
  }
}

type ProxiedResponse = Pick<AxiosResponse, "data" | "status" | "statusText">;

/**
 * An error response from a 3rd party API via the PixieBrix proxy
 * @see RemoteServiceError
 */
export class ProxiedRemoteServiceError extends BusinessError {
  override name = "ProxiedRemoteServiceError";
  readonly response: ProxiedResponse;

  constructor(message: string, response: ProxiedResponse) {
    super(message);

    this.response = response;
  }
}
