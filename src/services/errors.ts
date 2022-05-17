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
  override name = "IncompatibleServiceError";
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

/**
 * Axios offers its own serialization method, but it doesn't include the response.
 * By deleting toJSON, the serialize-error library will use its default serialization
 */
export type SerializableAxiosError = Except<AxiosError, "toJSON">;

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

/**
 * Base class for request errors from client to 3rd-party service.
 */
export class ClientRequestError extends BusinessError {
  override name = "ClientRequestError";
  override readonly cause: SerializableAxiosError;
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor -- Required to make the types stricter
  constructor(message: string, options: { cause: SerializableAxiosError }) {
    super(message, options);
  }
}

/**
 * An error response from a 3rd party API.
 */
export class RemoteServiceError extends ClientRequestError {
  override name = "RemoteServiceError";
}

/**
 * An error triggered by a failed network request due to missing permissions
 *
 * - Blocked by browser due to CORS
 *
 * @see ClientNetworkError
 */
export class ClientNetworkPermissionError extends ClientRequestError {
  override name = "ClientNetworkPermissionError";
}

/**
 * An error triggered by a failed network request that did not receive a response.
 *
 * - Request timeout
 * - The host doesn't exist (DNS failed)
 * - Blocked by browser due to HTTPS certificate
 * - Blocked by browser extension
 *
 * @see RemoteServiceError
 * @see ClientNetworkError
 */
export class ClientNetworkError extends ClientRequestError {
  override name = "ClientNetworkError";
}
