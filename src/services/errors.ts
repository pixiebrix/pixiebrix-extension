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

import { AxiosResponse } from "axios";

export class IncompatibleServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncompatibleServiceError";
  }
}

export class MissingConfigurationError extends Error {
  serviceId: string;

  id: string;

  constructor(message: string, serviceId: string, id?: string) {
    super(message);
    this.name = "MissingConfigurationError";
    this.serviceId = serviceId;
    this.id = id;
  }
}

export class NotConfiguredError extends Error {
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

export class UnknownServiceError extends Error {
  serviceId: string;

  constructor(message: string, serviceId: string) {
    super(message);
    this.name = "UnknownServiceError";
    this.serviceId = serviceId;
  }
}

export class RemoteServiceError extends Error {
  response: AxiosResponse | null;

  constructor(message: string, response: AxiosResponse | null) {
    super(message);
    this.name = "RemoteServiceError";
    this.response = response;
  }
}
