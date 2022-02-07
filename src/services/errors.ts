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

import { AxiosError, AxiosResponse } from "axios";
import { BusinessError, SuspiciousOperationError } from "@/errors";
import { Except } from "type-fest";

export class IncompatibleServiceError extends SuspiciousOperationError {
  constructor(message: string) {
    super(message);
    this.name = "IncompatibleServiceError";
  }
}

export class MissingConfigurationError extends BusinessError {
  serviceId: string;

  id: string;

  constructor(message: string, serviceId: string, id?: string) {
    super(message);
    this.name = "MissingConfigurationError";
    this.serviceId = serviceId;
    this.id = id;
  }
}

export class NotConfiguredError extends BusinessError {
  serviceId: string;

  missingProperties: string[];

  constructor(
    message: string,
    serviceId: string,
    missingProperties?: string[]
  ) {
    super(message);
    this.name = "NotConfiguredError";
    this.serviceId = serviceId;
    this.missingProperties = missingProperties;
  }
}

// Axios offers its own serialization method, but it doesn't include the response.
// By deleting toJSON, the serialize-error library will use its default serialization
type SerializableAxiosError = Except<AxiosError, "toJSON">;

type ProxiedResponse = Pick<AxiosResponse, "data" | "status" | "statusText">;

export type SanitizedURL = string & {
  _sanitizedUrlBrand: never;
};

/**
 * An error response from a 3rd party API
 * @see BrowserNetworkError
 */
export class RemoteServiceError extends BusinessError {
  readonly error: SerializableAxiosError;
  readonly url: SanitizedURL;

  constructor(message: string, error: AxiosError, url: SanitizedURL) {
    super(message);
    this.name = "RemoteServiceError";

    // Axios offers its own serialization method, but it doesn't include the response.
    // By deleting toJSON, the serialize-error library will use its default serialization
    delete error.toJSON;

    this.error = error;
    this.url = url;
  }
}

/**
 * An error response from a 3rd party API via the PixieBrix proxy
 * @see RemoteServiceError
 */
export class ProxiedRemoteServiceError extends BusinessError {
  readonly response: ProxiedResponse;

  constructor(message: string, response: ProxiedResponse) {
    super(message);
    this.name = "ProxiedRemoteServiceError";

    this.response = response;
  }
}

/**
 * An error triggered by a failed network request due to missing permissions
 *
 * - Blocked by browser due to CORS
 *
 * @see ClientNetworkError
 */
export class ClientNetworkPermissionError extends BusinessError {
  readonly error: SerializableAxiosError;
  readonly url: SanitizedURL;

  constructor(message: string, error: AxiosError, url: SanitizedURL) {
    super(message);
    this.name = "ClientNetworkPermissionError";

    // Axios offers its own serialization method, but it doesn't include the response.
    // By deleting toJSON, the serialize-error library will use its default serialization
    delete error.toJSON;

    this.error = error;
    this.url = url;
  }
}

/**
 * An error triggered by a failed network request that did not receive a response.
 *
 * - Timeout
 * - The URL doesn't exist
 * - Blocked by browser due to HTTPS certificate
 * - Blocked by browser extension
 *
 * @see RemoteServiceError
 * @see ClientNetworkError
 */
export class ClientNetworkError extends BusinessError {
  readonly error: SerializableAxiosError;
  readonly url: SanitizedURL;

  constructor(message: string, error: AxiosError, url: SanitizedURL) {
    super(message);
    this.name = "ClientNetworkError";

    // Axios offers its own serialization method, but it doesn't include the response.
    // By deleting toJSON, the serialize-error library will use its default serialization
    delete error.toJSON;

    this.error = error;

    this.url = url;
  }
}
