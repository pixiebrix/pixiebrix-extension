/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { produce } from "immer";
import { renderMustache } from "../runtime/mapArgs";
import { testMatchPatterns } from "../bricks/available";
import { isEmpty, castArray, uniq, compact } from "lodash";
import type { NetworkRequestConfig } from "@/types/networkTypes";
import { BusinessError, NotConfiguredError } from "../errors/businessErrors";
import { IncompatibleServiceError } from "../errors/genericErrors";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import {
  type AuthData,
  type BasicAuthenticationDefinition,
  type KeyAuthenticationDefinition,
  type OAuth2AuthenticationDefinition,
  type OAuth2AuthorizationGrantDefinition,
  type OAuth2Context,
  type SanitizedConfig,
  IntegrationABC,
  type SecretsConfig,
  type IntegrationDefinition,
  type TokenAuthenticationDefinition,
  type TokenContext,
} from "./integrationTypes";
import { type SemVerString } from "@/types/registryTypes";
import { canParseUrl, selectAbsoluteUrl } from "../utils/urlUtils";
import { missingProperties } from "../utils/schemaUtils";
import { assertNotNullish } from "../utils/nullishUtils";
import { stringToBase64 } from "uint8array-extras";

/**
 * Like selectAbsoluteUrl, but throws an integrations-specific error instead
 * @see selectAbsoluteUrl
 */
function selectAbsoluteUrlForIntegrations(
  url: string,
  baseURL: string | undefined,
): string {
  try {
    return selectAbsoluteUrl({ url, baseURL });
  } catch {
    throw new Error(
      "Must use absolute URLs for integrations that don't define a baseURL",
    );
  }
}

/**
 * An integration hydrated from a user-defined definition. Has the ability to authenticate requests because it has
 * access to authenticate secrets.
 */
class UserDefinedIntegration<
  TDefinition extends IntegrationDefinition = IntegrationDefinition,
> extends IntegrationABC {
  private readonly _definition: TDefinition;

  public readonly schema: Schema;
  public readonly uiSchema?: UiSchema;

  public readonly hasAuth: boolean;

  // XXX: in the future, version should be required. We currently can't mark it as required because
  // IntegrationDefinition uses the Metadata type, which accommodate user-defined packages which have a version
  // and built-in JS-defined bricks which don't have a version
  public readonly version?: SemVerString;

  constructor(definition: TDefinition) {
    const { id, name, description, version } = definition.metadata;
    super(id, name, description);
    this._definition = definition;
    this.schema = this._definition.inputSchema;
    this.uiSchema = this._definition.uiSchema;
    this.hasAuth = !isEmpty(this._definition.authentication);
    this.version = version;
  }

  /**
   * Return true if this integration can be used to authenticate against the given URL.
   */
  isAvailable(url: string): boolean {
    const patterns = castArray(
      this._definition.isAvailable?.matchPatterns ?? [],
    );
    return patterns.length === 0 || testMatchPatterns(patterns, url);
  }

  /**
   * Return true if integration exchanges credentials for a bearer token
   */
  get isToken(): boolean {
    return (
      this._definition.authentication != null &&
      "token" in this._definition.authentication
    );
  }

  /**
   * Return true if integration uses OAuth2 authentication
   */
  get isOAuth2(): boolean {
    return (
      this._definition.authentication != null &&
      "oauth2" in this._definition.authentication
    );
  }

  /**
   * Returns true if the integration defines an OAuth2 PKCE flow
   * @since 1.7.37
   */
  get isOAuth2PKCE(): boolean {
    return (
      this.isOAuth2 &&
      "code_challenge_method" in
        (this._definition.authentication as OAuth2AuthenticationDefinition)
          .oauth2
    );
  }

  /**
   * Return true if integration uses basic authentication
   * @since 1.7.16
   */
  get isBasicHttpAuth(): boolean {
    return (
      this._definition.authentication != null &&
      "basic" in this._definition.authentication
    );
  }

  /**
   * Return true if integration uses OAuth2 authorization grant
   */
  get isAuthorizationGrant(): boolean {
    return (
      this.isOAuth2 &&
      (this._definition.authentication as OAuth2AuthorizationGrantDefinition)
        .oauth2.grantType === "authorization_code"
    );
  }

  /**
   * Returns origins that require permissions to use the integration
   */
  getOrigins(integrationConfig: SanitizedConfig): string[] {
    const patterns = castArray(
      this._definition.isAvailable?.matchPatterns ?? [],
    );

    const baseUrlTemplate =
      "baseURL" in this._definition.authentication &&
      this._definition.authentication.baseURL;
    if (baseUrlTemplate) {
      // Convert into a real match pattern: https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
      const baseUrl = renderMustache(baseUrlTemplate, integrationConfig);
      if (canParseUrl(baseUrl)) {
        patterns.push(baseUrl + (baseUrl.endsWith("/") ? "*" : "/*"));
      } else {
        // Ignore invalid URLs. When the user makes a request, they'll get an error that it's an invalid URL
        console.warn("Invalid baseURL provided by configuration", {
          baseUrlTemplate,
          baseUrl,
          integrationConfig,
        });
      }
    }

    if (this.isOAuth2) {
      const oauth = this._definition
        .authentication as OAuth2AuthenticationDefinition;

      // Don't add wildcard because the URL can't change per request.
      const authUrls = [oauth.oauth2.authorizeUrl, oauth.oauth2.tokenUrl]
        .filter((template) => template != null)
        .map((template) => renderMustache(template, integrationConfig))
        .filter((url) => canParseUrl(url));
      patterns.push(...authUrls);
    }

    if (this.isToken) {
      const tokenUrl = (
        this._definition as IntegrationDefinition<TokenAuthenticationDefinition>
      ).authentication.token.url;
      patterns.push(renderMustache(tokenUrl, integrationConfig));
    }

    return uniq(compact(patterns));
  }

  getTokenContext(integrationConfig: SecretsConfig): TokenContext | undefined {
    if (this.isToken) {
      const definition: TokenContext = (
        this._definition.authentication as TokenAuthenticationDefinition
      ).token;
      return renderMustache<TokenContext>(definition, integrationConfig);
    }

    return undefined;
  }

  getOAuth2Context(
    integrationConfig: SecretsConfig,
  ): OAuth2Context | undefined {
    if (this.isOAuth2) {
      const definition: OAuth2Context = (
        this._definition.authentication as OAuth2AuthenticationDefinition
      ).oauth2;
      console.debug("getOAuth2Context", {
        definition,
        integrationConfig,
      });
      return renderMustache<OAuth2Context>(definition, integrationConfig);
    }

    return undefined;
  }

  /**
   * Test that the request URL can be called by this integration.
   * @throws IncompatibleServiceError if the resulting URL cannot by called by this integration
   */
  private checkRequestUrl(
    requestConfig: NetworkRequestConfig,
    baseURL?: string,
  ): void {
    let absoluteURL: string | undefined;

    try {
      absoluteURL = selectAbsoluteUrl({
        url: requestConfig.url,
        baseURL,
      });
    } catch {
      // Handled later
    }

    if (!absoluteURL || !this.isAvailable(absoluteURL)) {
      throw new IncompatibleServiceError(
        `Integration ${this.id} cannot be used to authenticate requests to ${
          absoluteURL ?? requestConfig.url
        }`,
      );
    }
  }

  private authenticateRequestKey(
    integrationConfig: SecretsConfig,
    requestConfig: NetworkRequestConfig,
  ): NetworkRequestConfig {
    if (!this.isAvailable(requestConfig.url)) {
      throw new IncompatibleServiceError(
        `Integration ${this.id} cannot be used to authenticate requests to ${requestConfig.url}`,
      );
    }

    const {
      baseURL,
      headers = {},
      params = {},
    } = renderMustache<KeyAuthenticationDefinition>(
      (this._definition.authentication as KeyAuthenticationDefinition) ?? {},
      integrationConfig,
    );

    const absoluteURL = selectAbsoluteUrlForIntegrations(
      requestConfig.url,
      baseURL,
    );

    const result = produce(requestConfig, (draft) => {
      draft.url = absoluteURL;
      draft.headers = { ...draft.headers, ...headers };
      draft.params = { ...draft.params, ...params };
    });

    this.checkRequestUrl(requestConfig, baseURL);

    return result;
  }

  private authenticateBasicRequest(
    integrationConfig: SecretsConfig,
    requestConfig: NetworkRequestConfig,
  ): NetworkRequestConfig {
    if (!this.isAvailable(requestConfig.url)) {
      throw new IncompatibleServiceError(
        `Integration ${this.id} cannot be used to authenticate requests to ${requestConfig.url}`,
      );
    }

    const {
      baseURL,
      basic,
      headers = {},
    } = renderMustache<BasicAuthenticationDefinition>(
      this._definition.authentication as BasicAuthenticationDefinition,
      integrationConfig,
    );

    if (isEmpty(basic.username) && isEmpty(basic.password)) {
      throw new BusinessError(
        "At least one of username and password is required for basic authentication",
      );
    }

    const absoluteURL = selectAbsoluteUrlForIntegrations(
      requestConfig.url,
      baseURL,
    );

    const result = produce(requestConfig, (draft) => {
      draft.url = absoluteURL;
      draft.headers = {
        ...draft.headers,
        Authorization: `Basic ${stringToBase64(
          [basic.username, basic.password].join(":"),
        )}`,
        ...headers,
      };
    });

    this.checkRequestUrl(requestConfig, baseURL);

    return result;
  }

  private authenticateRequestToken(
    integrationConfig: SecretsConfig,
    requestConfig: NetworkRequestConfig,
    tokenData: AuthData,
  ): NetworkRequestConfig {
    if (isEmpty(tokenData)) {
      throw new Error("Empty token data provided");
    }

    const { baseURL, headers = {} } = renderMustache(
      this._definition.authentication as
        | OAuth2AuthenticationDefinition
        | TokenAuthenticationDefinition,
      { ...integrationConfig, ...tokenData },
    );

    const absoluteURL = selectAbsoluteUrlForIntegrations(
      requestConfig.url,
      baseURL,
    );

    const result = produce(requestConfig, (draft) => {
      draft.url = absoluteURL;
      draft.headers = { ...draft.headers, ...headers };
    });

    this.checkRequestUrl(requestConfig, baseURL);

    return result;
  }

  authenticateRequest(
    integrationConfig: SecretsConfig,
    requestConfig: NetworkRequestConfig,
    authData?: AuthData,
  ): NetworkRequestConfig {
    const missing = missingProperties(this.schema, integrationConfig);
    if (missing.length > 0) {
      throw new NotConfiguredError(
        `Integration ${this.id} is not fully configured`,
        this.id,
        missing,
      );
    }

    if (this.isOAuth2 || this.isToken) {
      assertNotNullish(
        authData,
        "This integration requires authentication data but it was not provided",
      );
      return this.authenticateRequestToken(
        integrationConfig,
        requestConfig,
        authData,
      );
    }

    if (this.isBasicHttpAuth) {
      return this.authenticateBasicRequest(integrationConfig, requestConfig);
    }

    return this.authenticateRequestKey(integrationConfig, requestConfig);
  }
}

export function fromJS(
  component: IntegrationDefinition,
): UserDefinedIntegration {
  return new UserDefinedIntegration(component);
}
