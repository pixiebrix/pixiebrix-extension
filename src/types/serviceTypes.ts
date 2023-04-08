/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type AxiosRequestConfig } from "axios";
import { type OutputKey } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import { type BlockIcon } from "@/types/iconTypes";
import { type JsonObject, JsonValue } from "type-fest";
import { Metadata } from "@/types/registryTypes";

type SanitizedBrand = { _sanitizedConfigBrand: null };

type SecretBrand = { _serviceConfigBrand: null };

/**
 * A one-level deep config.
 */
export type KeyedConfig = Record<string, string | null>;

export interface ServiceDependency {
  /**
   * The registry id of the service.
   */
  id: RegistryId;

  /**
   * The output key for the dependency (without the leading "@")
   */
  outputKey: OutputKey;

  /**
   * The UUID of the service configuration.
   */
  config?: UUID;
}

export type ServiceAuthPair = {
  /**
   * The registry id of the service.
   */
  id: RegistryId;

  /**
   * UUID of the service configuration.
   */
  config: UUID;
};

/**
 * Nominal typing to distinguish from `ServiceConfig`
 * @see `ServiceConfig`
 */
export type SanitizedConfig = KeyedConfig & SanitizedBrand;

/**
 * Nominal typing to distinguish from SanitizedConfig
 * @see `SanitizedConfig`
 */
export type ServiceConfig = KeyedConfig & SecretBrand;

/**
 * Data received from the 3rd-party service during an OAuth or token-exchange flow.
 *
 * @see setCachedAuthData
 * @see getCachedAuthData
 */
export interface AuthData {
  /**
   * Nominal typing to distinguish from `SanitizedConfig` and `ServiceConfig`
   */
  _oauthBrand: null;
  [key: string]: unknown;
}

export interface TokenContext {
  url: string;
  data: JsonObject;
}

export interface OAuth2Context {
  host?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  client_id: string;
  client_secret?: string;
  code_challenge_method?: "S256";
}

/** Service configuration provided by a user. */
export type RawServiceConfiguration = {
  // Nominal typing to distinguish from SanitizedServiceConfiguration
  _rawServiceConfigurationBrand: null;

  /**
   * UUID of the service configuration
   */
  id: UUID | undefined;

  /**
   * Registry identifier for the service, e.g., `@pixiebrix/api`.
   */
  serviceId: RegistryId;

  /**
   * Human-readable label for the configuration to distinguish it from other configurations for the same service in the
   * interface.
   */
  label: string | undefined;

  /**
   * Configuration including all data
   */
  config: ServiceConfig;
};

export interface SanitizedServiceConfiguration {
  // Nominal typing to distinguish from RawServiceConfiguration
  _sanitizedServiceConfigurationBrand: null;

  /**
   * UUID of the service configuration.
   */
  id?: UUID;

  /**
   * Registry identifier for the service, e.g., @pixiebrix/api
   */
  serviceId: RegistryId;

  /**
   * Sanitized configuration, i.e., excluding secrets and keys.
   */
  config: SanitizedConfig;

  /**
   * True if the service must be proxied for remote configs, e.g., because it has a secret it needs
   * to use to authenticate.
   */
  proxy: boolean;
}

/**
 * A service that can be dependency injected and used to authenticate external requests.
 *
 * The input/output schema is the same since it's directly user configured.
 */
export interface IService<
  TConfig extends KeyedConfig = KeyedConfig,
  TSanitized = TConfig & { _sanitizedConfigBrand: null },
  TSecret = TConfig & { _serviceConfigBrand: null },
  TOAuth extends AuthData = AuthData
> extends Metadata {
  schema: Schema;

  /**
   * A uiSchema for the service configuration.
   * @since 1.7.16
   */
  uiSchema?: UiSchema;

  isOAuth2: boolean;

  isAuthorizationGrant: boolean;

  isToken: boolean;

  /**
   * True if service uses basic access authentication to authenticate
   * https://en.wikipedia.org/wiki/Basic_access_authentication
   */
  isBasicHttpAuth: boolean;

  getOrigins: (serviceConfig: TSanitized) => string[];

  getOAuth2Context: (serviceConfig: TSecret) => OAuth2Context;

  getTokenContext: (serviceConfig: TSecret) => TokenContext;

  authenticateRequest: (
    serviceConfig: TSecret,
    requestConfig: AxiosRequestConfig,
    oauthConfig?: TOAuth
  ) => AxiosRequestConfig;
}

export abstract class Service<
  TConfig extends KeyedConfig = KeyedConfig,
  TOAuth extends AuthData = AuthData
> implements IService<TConfig>
{
  abstract schema: Schema;

  abstract hasAuth: boolean;

  abstract get isOAuth2(): boolean;

  abstract get isAuthorizationGrant(): boolean;

  abstract get isToken(): boolean;

  abstract get isBasicHttpAuth(): boolean;

  protected constructor(
    public id: RegistryId,
    public name: string,
    public description?: string,
    public icon?: BlockIcon
  ) {
    // No body necessary https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties
  }

  abstract getOrigins(serviceConfig: TConfig & SanitizedBrand): string[];

  abstract getOAuth2Context(
    serviceConfig: TConfig & SecretBrand
  ): OAuth2Context;

  abstract getTokenContext(serviceConfig: TConfig & SecretBrand): TokenContext;

  abstract authenticateRequest(
    serviceConfig: TConfig & SecretBrand,
    requestConfig: AxiosRequestConfig,
    authConfig?: TOAuth
  ): AxiosRequestConfig;
}

export interface KeyAuthenticationDefinition {
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface TokenAuthenticationDefinition {
  baseURL?: string;
  token: {
    url: string;
    data: Record<string, JsonValue>;
  };
  headers: Record<string, string>;
}

export interface BasicAuthenticationDefinition {
  baseURL?: string;
  basic: {
    username: string;
    password: string;
  };
  headers: Record<string, string>;
}

export interface OAuth2AuthenticationDefinition {
  baseURL?: string;
  oauth2: {
    client_id: string;
    authorizeUrl: string;
    tokenUrl: string;
  };
  headers: Record<string, string>;
}

export interface OAuth2AuthorizationGrantDefinition {
  oauth2: {
    grantType: "authorization_code";
  };
  headers: Record<string, string>;
}

export interface ServiceDefinition<
  TAuth =
    | KeyAuthenticationDefinition
    | OAuth2AuthenticationDefinition
    | OAuth2AuthorizationGrantDefinition
    | TokenAuthenticationDefinition
    | BasicAuthenticationDefinition
> {
  metadata: Metadata;
  inputSchema: Schema;
  uiSchema?: UiSchema;
  isAvailable?: {
    matchPatterns: string | string[];
  };
  authentication: TAuth;
}
