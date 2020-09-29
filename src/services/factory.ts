import { Service } from "@/types";
import produce from "immer";
import { mapArgs, missingProperties } from "@/helpers";
import {
  IncompatibleServiceError,
  NotConfiguredError,
} from "@/services/errors";
import { Schema, ServiceConfig } from "@/core";
import castArray from "lodash/castArray";
import { testMatchPattern } from "@/blocks/available";
import isEmpty from "lodash/isEmpty";

import {
  ServiceDefinition,
  AuthenticationDefinition,
} from "@/types/definitions";
import { AxiosRequestConfig } from "axios";

/**
 * A service created from a local definition. Has the ability to authenticate requests because it has
 * access to authenticate secrets.
 */
class LocalDefinedService extends Service {
  private readonly _definition: ServiceDefinition;
  public readonly schema: Schema;
  public readonly hasAuth: boolean;

  constructor(definition: ServiceDefinition) {
    const { id, name, description, icon } = definition.metadata;
    super(id, name, description, icon);
    this._definition = definition;
    this.schema = this._definition.inputSchema;
    this.hasAuth = !isEmpty(this._definition.authentication);
  }

  isAvailable(url: string): boolean {
    const patterns = castArray(
      this._definition.isAvailable?.matchPatterns ?? []
    );
    return (
      patterns.length == 0 || patterns.some((x) => testMatchPattern(x, url))
    );
  }

  authenticateRequest(
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig
  ): AxiosRequestConfig {
    const missing = missingProperties(this.schema, serviceConfig);
    if (missing.length) {
      throw new NotConfiguredError(
        `Service ${this.id} is not fully configured`,
        this.id,
        missing
      );
    } else if (!this.isAvailable(requestConfig.url)) {
      throw new IncompatibleServiceError(
        `Service ${this.id} cannot be used to authenticate requests to ${requestConfig.url}`
      );
    }

    const { headers = {}, params = {} } = mapArgs<AuthenticationDefinition>(
      this._definition.authentication ?? {},
      serviceConfig
    );
    return produce(requestConfig, (draft) => {
      draft.headers = { ...(draft.headers ?? {}), ...headers };
      draft.params = { ...(draft.params ?? {}), ...params };
    });
  }
}

export function fromJS(component: ServiceDefinition): LocalDefinedService {
  return new LocalDefinedService(component);
}
