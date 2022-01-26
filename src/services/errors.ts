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

import { AxiosResponse } from "axios";
import { BusinessError, SuspiciousOperationError } from "@/errors";

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

export class RemoteServiceError extends BusinessError {
  response: AxiosResponse;

  constructor(message: string, response?: AxiosResponse) {
    super(message);
    this.name = "RemoteServiceError";
    this.response = response;
  }
}
