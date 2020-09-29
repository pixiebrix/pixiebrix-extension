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

export class MultipleConfigurationError extends Error {
  serviceId: string;

  constructor(message: string, serviceId: string) {
    super(message);
    this.name = "MultipleConfigurationError";
    this.serviceId = serviceId;
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
  response: AxiosResponse;

  constructor(message: string, response: AxiosResponse) {
    super(message);
    this.name = "RemoteServiceError";
    this.response = response;
  }
}
