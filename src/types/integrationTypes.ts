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
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import { type BrickIcon } from "@/types/iconTypes";
import { type JsonObject, type JsonValue } from "type-fest";
import { type Metadata, type RegistryId } from "@/types/registryTypes";

export interface IntegrationDependency {
  /**
   * The registry id of the integration.
   */
  id: RegistryId;

  /**
   * The output key for the dependency (without the leading "@")
   */
  outputKey: OutputKey;

  /**
   * The UUID of the integration configuration.
   */
  config?: UUID;

  /**
   * Whether the integration is optional for the mod to function
   * @since 1.7.37 - added to facilitate optional integrations during activation
   */
  isOptional?: boolean;
}

type SanitizedBrand = { _sanitizedConfigBrand: null };

type SecretBrand = { _integrationConfigBrand: null };

/**
 * A one-level deep integration config that might have already been sanitized.
 */
export type IntegrationConfigArgs = Record<string, string | null>;

/**
 * Nominal typing to distinguish from `IntegrationConfig`
 * @see SecretsConfig
 */
export type SanitizedConfig = IntegrationConfigArgs & SanitizedBrand;

/**
 * Nominal typing to distinguish from `SanitizedConfig`
 * @see SanitizedConfig
 */
export type SecretsConfig = IntegrationConfigArgs & SecretBrand;

/**
 * Data received from the 3rd-party integration during an OAuth or token-exchange flow.
 *
 * @see setCachedAuthData
 * @see getCachedAuthData
 */
export interface AuthData {
  /**
   * Nominal typing to distinguish from `SanitizedConfig` and `IntegrationConfigArgs`
   */
  _oauthBrand: null;
  [key: string]: unknown;
}

/** Integration configuration provided by a user. */
export type IntegrationConfig = {
  // Nominal typing to distinguish from SanitizedIntegrationConfig
  _rawIntegrationConfigBrand: null;

  /**
   * UUID of the integration configuration
   */
  id: UUID | undefined;

  /**
   * Registry identifier for the integration, e.g., `@pixiebrix/api`.
   */
  serviceId: RegistryId;

  /**
   * Human-readable label for the configuration to distinguish it from other configurations for the same integration in the
   * interface.
   */
  label: string | undefined;

  /**
   * Configuration including all data
   */
  config: SecretsConfig;
};

export interface SanitizedIntegrationConfig {
  // Nominal typing to distinguish from IntegrationConfig
  _sanitizedIntegrationConfigBrand: null;

  /**
   * UUID of the integration configuration.
   */
  id?: UUID;

  /**
   * Registry identifier for the integration, e.g., @pixiebrix/api
   */
  serviceId: RegistryId;

  /**
   * Sanitized configuration, i.e., excluding secrets and keys.
   */
  config: SanitizedConfig;

  /**
   * True if the integration must be proxied for remote configs, e.g., because it has a secret it needs
   * to use to authenticate.
   */
  proxy: boolean;
}

export type KeyAuthenticationDefinition = {
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
};

export type TokenAuthenticationDefinition = {
  baseURL?: string;
  token: {
    url: string;
    data: Record<string, JsonValue>;
  };
  headers: Record<string, string>;
};

export type BasicAuthenticationDefinition = {
  baseURL?: string;
  basic: {
    username: string;
    password: string;
  };
  headers: Record<string, string>;
};

export type OAuth2AuthenticationDefinition = {
  baseURL?: string;
  oauth2: {
    client_id: string;
    authorizeUrl: string;
    tokenUrl: string;
  };
  headers: Record<string, string>;
};

export type OAuth2AuthorizationGrantDefinition = {
  oauth2: {
    grantType: "authorization_code";
  };
  headers: Record<string, string>;
};

export interface IntegrationDefinition<
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

/**
 * Rendered context for making token-authenticated requests.
 */
export type TokenContext = {
  url: string;
  data: JsonObject;
};

/**
 * Rendered context for making OAuth2 requests.
 */
export type OAuth2Context = {
  host?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  client_id: string;
  client_secret?: string;
  code_challenge_method?: "S256";
};

/**
 * An integration that can be dependency injected and used to authenticate external requests.
 *
 * The input/output schema is the same since it's directly user configured.
 */
export interface Integration<
  TConfig extends IntegrationConfigArgs = IntegrationConfigArgs,
  TSanitized = TConfig & { _sanitizedConfigBrand: null },
  TSecret = TConfig & { _integrationConfigBrand: null },
  TOAuth extends AuthData = AuthData
> extends Metadata {
  schema: Schema;

  /**
   * A uiSchema for the integration configuration.
   * @since 1.7.16
   */
  uiSchema?: UiSchema;

  isOAuth2: boolean;

  isOAuth2PKCE: boolean;

  isAuthorizationGrant: boolean;

  isToken: boolean;

  /**
   * True if integration uses basic access authentication to authenticate
   * https://en.wikipedia.org/wiki/Basic_access_authentication
   */
  isBasicHttpAuth: boolean;

  getOrigins: (integrationConfig: TSanitized) => string[];

  getOAuth2Context: (integrationConfig: TSecret) => OAuth2Context;

  getTokenContext: (integrationConfig: TSecret) => TokenContext;

  authenticateRequest: (
    integrationConfig: TSecret,
    requestConfig: AxiosRequestConfig,
    oauthConfig?: TOAuth
  ) => AxiosRequestConfig;
}

/**
 * Abstract base class for integrations.
 */
export abstract class IntegrationABC<
  TConfig extends IntegrationConfigArgs = IntegrationConfigArgs,
  TOAuth extends AuthData = AuthData
> implements Integration<TConfig>
{
  abstract schema: Schema;

  /**
   * Returns true if the integration performs authentication. Also includes integrations that set other
   * headers/parameters on API requests.
   */
  abstract hasAuth: boolean;

  abstract get isOAuth2(): boolean;

  abstract get isOAuth2PKCE(): boolean;

  abstract get isAuthorizationGrant(): boolean;

  abstract get isToken(): boolean;

  abstract get isBasicHttpAuth(): boolean;

  protected constructor(
    public id: RegistryId,
    public name: string,
    public description?: string,
    public icon?: BrickIcon
  ) {
    // No body necessary https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties
  }

  abstract getOrigins(integrationConfig: TConfig & SanitizedBrand): string[];

  abstract getOAuth2Context(
    integrationConfig: TConfig & SecretBrand
  ): OAuth2Context;

  abstract getTokenContext(
    integrationConfig: TConfig & SecretBrand
  ): TokenContext;

  abstract authenticateRequest(
    integrationConfig: TConfig & SecretBrand,
    requestConfig: AxiosRequestConfig,
    authConfig?: TOAuth
  ): AxiosRequestConfig;
}
