import { Service } from "@/types";
import produce from "immer";
import { mapArgs, missingProperties } from "@/helpers";
import {
  IncompatibleServiceError,
  NotConfiguredError,
} from "@/services/errors";
import { OAuth2Context, OAuthData, Schema, ServiceConfig } from "@/core";
import castArray from "lodash/castArray";
import { testMatchPattern } from "@/blocks/available";
import isEmpty from "lodash/isEmpty";
import urljoin from "url-join";
import {
  ServiceDefinition,
  KeyAuthenticationDefinition,
  OAuth2AuthenticationDefinition,
} from "@/types/definitions";
import { AxiosRequestConfig } from "axios";
import { isAbsoluteURL } from "@/hooks/fetch";

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

  get isOAuth2(): boolean {
    return "oauth2" in this._definition.authentication;
  }

  getOAuth2Context(serviceConfig: ServiceConfig): OAuth2Context {
    if (this.isOAuth2) {
      const definition: OAuth2Context = (this._definition
        .authentication as OAuth2AuthenticationDefinition).oauth2;
      console.debug("oauth2 context", { definition, serviceConfig });
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

  private authenticateRequestOAuth2(
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig,
    oauthData: OAuthData
  ): AxiosRequestConfig {
    // console.debug('authenticateRequestOAuth2', {
    //   definition: this._definition.authentication,
    //   context: {...serviceConfig, ...oauthData},
    // });

    const { baseURL, headers = {} } = mapArgs(
      this._definition.authentication as OAuth2AuthenticationDefinition,
      { ...serviceConfig, ...oauthData }
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
    oauthData?: OAuthData
  ): AxiosRequestConfig {
    const missing = missingProperties(this.schema, serviceConfig);
    if (missing.length) {
      throw new NotConfiguredError(
        `Service ${this.id} is not fully configured`,
        this.id,
        missing
      );
    }

    return this.isOAuth2
      ? this.authenticateRequestOAuth2(serviceConfig, requestConfig, oauthData)
      : this.authenticateRequestKey(serviceConfig, requestConfig);
  }
}

export function fromJS(component: ServiceDefinition): LocalDefinedService {
  return new LocalDefinedService(component);
}
