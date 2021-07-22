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

import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { UiSchema as StandardUiSchema } from "@rjsf/core";
import { AxiosRequestConfig } from "axios";
import { Primitive } from "type-fest";
import { ErrorObject } from "serialize-error";
import { Permissions } from "webextension-polyfill-ts";
import { pick } from "lodash";

export type TemplateEngine = "mustache" | "nunjucks" | "handlebars";
export type Schema = JSONSchema7;
export type UiSchema = StandardUiSchema;
export type SchemaDefinition = JSONSchema7Definition;
export type SchemaProperties = Record<string, SchemaDefinition>;

export type RenderedHTML = string;

export type ActionType = string;

export interface Meta {
  nonce?: string;
  [index: string]: unknown;
}

/**
 * Standard message format for cross-context messaging.
 *
 * Inspired by: https://github.com/redux-utilities/flux-standard-action
 */
export interface Message<
  Type extends ActionType = ActionType,
  TMeta extends Meta = Meta
> {
  type: Type;
  payload?: unknown;
  meta?: TMeta;
}

export interface MessageContext {
  readonly deploymentId?: string;
  readonly blueprintId?: string;
  readonly extensionPointId?: string;
  readonly blockId?: string;
  readonly extensionId?: string;
  readonly serviceId?: string;
  readonly authId?: string;
}

export type SerializedError = Primitive | ErrorObject;

export interface Logger {
  readonly context: MessageContext;
  /**
   * Return a child logger with additional message context
   */
  childLogger: (additionalContext: MessageContext) => Logger;
  trace: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  debug: (msg: string, data?: Record<string, unknown>) => void;
  log: (msg: string, data?: Record<string, unknown>) => void;
  info: (msg: string, data?: Record<string, unknown>) => void;
  error: (
    error: SerializedError | Error,
    data?: Record<string, unknown>
  ) => void;
}

export type ReaderRoot = HTMLElement | Document;

export interface BlockOptions {
  // Using "any" for now so that blocks don't have to assert/cast all their argument types. We're checking
  // the inputs using yup/jsonschema, so the types should match what's expected.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctxt: Record<string, any>;
  logger: Logger;
  root: ReaderRoot;
  headless?: boolean;
}

// Using "any" for now so that blocks don't have to assert/cast all their argument types. We're checking
// the inputs using jsonschema, so the types should match what's expected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockArg = Record<string, any>;

export interface IOption {
  value: string | number | boolean;
  label: string;
}

export type BlockIcon = string;

/**
 * Metadata about a block, extension point, or service
 */
export interface Metadata {
  id: string;
  name: string;
  version?: string;
  description?: string;
  icon?: BlockIcon;
  author?: string;
}

export function selectMetadata(metadata: Metadata): Metadata {
  return pick(metadata, ["id", "name", "version", "description"]);
}

// Using "any" for now so that blocks don't have to assert/cast all their argument types. We're checking
// the inputs using jsonschema, so the types should match what's expected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BaseExtensionConfig = Record<string, any>;

export interface ServiceDependency {
  id: string;
  outputKey: string;
  config?: string;
}

export type ServiceLocator = (
  serviceId: string,
  id?: string
) => Promise<SanitizedServiceConfiguration>;

export interface DeploymentContext {
  id: string;
  timestamp: string;
}

export type ExtensionIdentifier = {
  extensionId: string;
  extensionPointId: string;
};

export interface IExtension<
  T extends BaseExtensionConfig = BaseExtensionConfig
> {
  id: string;

  extensionPointId: string;

  _deployment?: DeploymentContext;

  label?: string;

  /**
   * Default template engine when running the extension
   */
  templateEngine?: TemplateEngine;

  /**
   * Additional permissions, e.g., origins to perform effects on after opening a tab.
   */
  permissions?: Permissions.Permissions;

  /**
   * Configured services/integrations for the extension
   */
  services: ServiceDependency[];

  /**
   * Options the end-user has configured (i.e., during blueprint activation)
   */
  optionsArgs?: OptionsArgs;

  config: T;
}

export interface IExtensionPoint extends Metadata {
  inputSchema: Schema;

  permissions: Permissions.Permissions;

  defaultOptions: Record<string, unknown>;

  defaultReader: () => Promise<IReader>;

  isAvailable: () => Promise<boolean>;

  /**
   * True iff the extension point must be installed before the page can be considered ready
   */
  syncInstall: boolean;

  install(): Promise<boolean>;

  /**
   * Remove the extension point and installed extensions from the page.
   */
  uninstall(options?: { global?: boolean }): void;

  /**
   * Register an extension with the extension point. Does not actually install/run the extension.
   */
  addExtension(extension: IExtension): void;

  /**
   * Sync registered extensions, removing any extensions that aren't provided here. Does not actually install/run
   * the extensions.
   */
  syncExtensions(extensions: IExtension[]): void;

  run(): Promise<void>;

  /**
   * Returns any blocks configured in extension.
   */
  getBlocks: (extension: IExtension) => Promise<IBlock[]>;
}

export interface IBlock extends Metadata {
  /** A JSON schema of the inputs for the block */
  inputSchema: Schema;

  /** An optional a JSON schema for the output of the block */
  outputSchema?: Schema;

  defaultOptions: Record<string, unknown>;

  /**
   * Returns the optional permissions required to run this block
   * https://developer.chrome.com/extensions/permission_warnings
   */
  permissions: Permissions.Permissions;

  run: (value: BlockArg, options: BlockOptions) => Promise<unknown>;
}

export interface ReaderOutput {
  [key: string]: unknown;
}

/**
 * A block that can read data from a page or part of the page.
 */
export interface IReader extends IBlock {
  /** Return true if the Reader is for a page/element. */
  isAvailable: ($elt?: JQuery) => Promise<boolean>;

  read: (root: ReaderRoot) => Promise<ReaderOutput>;
}

type ServiceId = string;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- we're extending to get nominal typing
export interface KeyedConfig {
  [key: string]: string | null;
}

export interface SanitizedConfig extends KeyedConfig {
  // Nominal typing to distinguish from ServiceConfig
  _sanitizedConfigBrand: null;
}

export interface ServiceConfig extends KeyedConfig {
  // Nominal typing to distinguish from SanitizedConfig
  _serviceConfigBrand: null;
}

export interface AuthData {
  // Nominal typing to distinguish from SanitizedConfig and ServiceConfig
  _oauth: null;
  [key: string]: string | null;
}

export interface TokenContext {
  url: string;
  data: Record<string, unknown>;
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
export interface RawServiceConfiguration {
  // Nominal typing to distinguish from SanitizedServiceConfiguration
  _rawServiceConfigurationBrand: null;

  /**
   * UUID of the service configuration
   */
  id: string | undefined;

  serviceId: ServiceId;

  label: string | undefined;

  /**
   * Configuration including all data
   */
  config: ServiceConfig;
}

export interface SanitizedServiceConfiguration {
  // Nominal typing to distinguish from RawServiceConfiguration
  _sanitizedServiceConfigurationBrand: null;

  /**
   * UUID of the service configuration
   */
  id?: string;

  serviceId: ServiceId;

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

  isOAuth2: boolean;

  isToken: boolean;

  getOrigins: (serviceConfig: TSanitized) => string[];

  getOAuth2Context: (serviceConfig: TSecret) => OAuth2Context;

  getTokenContext: (serviceConfig: TSecret) => TokenContext;

  authenticateRequest: (
    serviceConfig: TSecret,
    requestConfig: AxiosRequestConfig,
    oauthConfig?: TOAuth
  ) => AxiosRequestConfig;
}

export type IconLibrary = "bootstrap" | "simple-icons" | "custom";

export interface IconConfig {
  id: string;
  library?: IconLibrary;
  size?: number;
  color?: string;
}

export interface OptionsArgs {
  [prop: string]: Primitive;
}

export interface RenderedArgs {
  // FIXME: enforcing nominal typing will require helper methods to product the RenderedArgs
  // _renderedArgsBrand: null;
  [prop: string]: unknown;
}

export interface OrganizationAuthState {
  readonly id: string;
  readonly name?: string;
  readonly scope?: string;
}

export interface AuthState {
  readonly userId?: string | null;
  readonly email?: string | null;
  readonly scope?: string | null;
  readonly isLoggedIn: boolean;
  readonly isOnboarded: boolean;
  readonly extension: boolean;
  readonly organization?: OrganizationAuthState | null;
  readonly flags: string[];
}

export type RawConfig = {
  kind: "service" | "extensionPoint" | "component" | "reader" | "recipe";
  metadata: Metadata;
};
