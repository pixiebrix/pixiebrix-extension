/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Service } from "@/types";
import produce from "immer";
import { mapArgs, missingProperties } from "@/helpers";
import {
  IncompatibleServiceError,
  NotConfiguredError,
} from "@/services/errors";
import {
  OAuth2Context,
  AuthData,
  Schema,
  ServiceConfig,
  TokenContext,
  SanitizedConfig,
} from "@/core";
import { testMatchPattern } from "@/blocks/available";
import { isEmpty, castArray, uniq, compact } from "lodash";
import urljoin from "url-join";
import {
  ServiceDefinition,
  KeyAuthenticationDefinition,
  OAuth2AuthenticationDefinition,
  TokenAuthenticationDefinition,
} from "@/types/definitions";
import { AxiosRequestConfig } from "axios";
import { isAbsoluteURL } from "@/hooks/fetch";

/**
 * A service created from a local definition. Has the ability to authenticate requests because it has
 * access to authenticate secrets.
 */
class LocalDefinedService<
  TDefinition extends ServiceDefinition = ServiceDefinition
> extends Service {
  private readonly _definition: TDefinition;
  public readonly schema: Schema;
  public readonly hasAuth: boolean;

  constructor(definition: TDefinition) {
    const { id, name, description, icon } = definition.metadata;
    super(id, name, description, icon);
    this._definition = definition;
    this.schema = this._definition.inputSchema;
    this.hasAuth = !isEmpty(this._definition.authentication);
  }

  /**
   * Return true if this service can be used to authenticate against the given URL.
   */
  isAvailable(url: string): boolean {
    const patterns = castArray(
      this._definition.isAvailable?.matchPatterns ?? []
    );
    return (
      patterns.length == 0 || patterns.some((x) => testMatchPattern(x, url))
    );
  }

  /**
   * Return true if service exchanges credentials for a bearer token
   */
  get isToken(): boolean {
    return "token" in this._definition.authentication;
  }

  /**
   * Return true if service uses OAuth2 authentication
   */
  get isOAuth2(): boolean {
    return "oauth2" in this._definition.authentication;
  }

  /**
   * Returns origins that require permissions to use the service
   * @param serviceConfig
   */
  getOrigins(serviceConfig: SanitizedConfig): string[] {
    const patterns = castArray(
      this._definition.isAvailable?.matchPatterns ?? []
    );

    if ("baseURL" in this._definition.authentication) {
      // convert into a real match pattern: https://developer.chrome.com/docs/extensions/mv3/match_patterns/
      const baseUrlTemplate = this._definition.authentication.baseURL;
      const baseUrl = mapArgs(baseUrlTemplate, serviceConfig);
      patterns.push(baseUrl.endsWith("/") ? `${baseUrl}*` : `${baseUrl}/*`);
    }

    if (this.isToken) {
      const tokenUrl = (this
        ._definition as ServiceDefinition<TokenAuthenticationDefinition>)
        .authentication.token.url;
      patterns.push(mapArgs(tokenUrl, serviceConfig));
    }

    return uniq(compact(patterns));
  }

  getTokenContext(serviceConfig: ServiceConfig): TokenContext {
    if (this.isToken) {
      const definition: TokenContext = (this._definition
        .authentication as TokenAuthenticationDefinition).token;
      // console.debug("token context", { definition, serviceConfig });
      return mapArgs<TokenContext>(definition, serviceConfig);
    } else {
      return undefined;
    }
  }

  getOAuth2Context(serviceConfig: ServiceConfig): OAuth2Context {
    if (this.isOAuth2) {
      const definition: OAuth2Context = (this._definition
        .authentication as OAuth2AuthenticationDefinition).oauth2;
      console.debug("getOAuth2Context", { definition, serviceConfig });
      return mapArgs<OAuth2Context>(definition, serviceConfig);
    } else {
      return undefined;
    }
  }

  private authenticateRequestKey(
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig
  ): AxiosRequestConfig {
    if (!this.isAvailable(requestConfig.url)) {
      throw new IncompatibleServiceError(
        `Service ${this.id} cannot be used to authenticate requests to ${requestConfig.url}`
      );
    }
    const { headers = {}, params = {} } = mapArgs<KeyAuthenticationDefinition>(
      (this._definition.authentication as KeyAuthenticationDefinition) ?? {},
      serviceConfig
    );
    return produce(requestConfig, (draft) => {
      draft.headers = { ...(draft.headers ?? {}), ...headers };
      draft.params = { ...(draft.params ?? {}), ...params };
    });
  }

  private authenticateRequestToken(
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig,
    tokenData: AuthData
  ): AxiosRequestConfig {
    if (isEmpty(tokenData)) {
      throw new Error("Empty token data provided");
    }

    const { baseURL, headers = {} } = mapArgs(
      this._definition.authentication as
        | OAuth2AuthenticationDefinition
        | TokenAuthenticationDefinition,
      { ...serviceConfig, ...tokenData }
    );

    if (!baseURL && !isAbsoluteURL(requestConfig.url)) {
      throw new Error(
        "Must use absolute URLs for services that don't define a baseURL"
      );
    }

    const result = produce(requestConfig, (draft) => {
      requestConfig.baseURL = baseURL;
      draft.headers = { ...(draft.headers ?? {}), ...headers };
    });

    const absoluteURL =
      baseURL && !isAbsoluteURL(requestConfig.url)
        ? urljoin(baseURL, requestConfig.url)
        : requestConfig.url;

    if (!this.isAvailable(absoluteURL)) {
      throw new IncompatibleServiceError(
        `Service ${this.id} cannot be used to authenticate requests to ${absoluteURL}`
      );
    }

    return result;
  }

  authenticateRequest(
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig,
    authData?: AuthData
  ): AxiosRequestConfig {
    const missing = missingProperties(this.schema, serviceConfig);
    if (missing.length) {
      throw new NotConfiguredError(
        `Service ${this.id} is not fully configured`,
        this.id,
        missing
      );
    }

    return this.isOAuth2 || this.isToken
      ? this.authenticateRequestToken(serviceConfig, requestConfig, authData)
      : this.authenticateRequestKey(serviceConfig, requestConfig);
  }
}

export function fromJS(component: ServiceDefinition): LocalDefinedService {
  return new LocalDefinedService(component);
}
