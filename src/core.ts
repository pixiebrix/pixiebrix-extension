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

import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7TypeName,
} from "json-schema";
import { UiSchema as StandardUiSchema } from "@rjsf/core";
import { AxiosRequestConfig } from "axios";
import { Except, Primitive } from "type-fest";
import { ErrorObject } from "serialize-error";
import { Permissions } from "webextension-polyfill-ts";
import { pick } from "lodash";

export type TemplateEngine = "mustache" | "nunjucks" | "handlebars";
// Use our own name in the project so we can re-map/adjust the typing as necessary
export type Schema = JSONSchema7;
export type UiSchema = StandardUiSchema;
export type SchemaDefinition = JSONSchema7Definition;
export type SchemaProperties = Record<string, SchemaDefinition>;
export type SchemaPropertyType = JSONSchema7TypeName;

/**
 * The PixieBrix brick definition API. Controls how the PixieBrix runtime interprets brick definitions.
 *
 * Incremented whenever backward-incompatible changes are made.
 *
 * - v1: original, implicit templating and dataflow
 * - v2: introduces explicitDataFlow
 */
export type ApiVersion = "v1" | "v2";

export type RenderedHTML = string;

export type ActionType = string;

/**
 * A valid identifier for a brick output key or a service key. (Does not include the preceding "@".)
 */
export type OutputKey = string & {
  _outputKeyBrand: never;
};

/**
 * A key with a "@"-prefix that refers to a service
 */
export type ServiceKeyVar = string & {
  _serviceKeyVarBrand: never;
};

/**
 * A string known not to be tainted with user-generated input.
 */
export type SafeString = string & {
  _safeStringBrand: never;
};

export type UUID = string & {
  // Nominal subtyping
  _uuidBrand: never;
};

export type InnerDefinitionRef = string & {
  // Nominal subtyping
  _innerDefinitionRefBrand: never;
};

/**
 * A brick registry id conforming to `@scope/collection/name`
 */
export type RegistryId = string & {
  // Nominal subtyping
  _registryIdBrand: never;
};
type ServiceId = RegistryId;

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

/**
 * Log event metadata for the extensions internal logging infrastructure.
 * @see Logger
 */
export type MessageContext = {
  /**
   * A human-readable label, e.g., provided via a `label:` directive to help identify the context when there's multiple
   * blocks with the same id being used.
   */
  readonly label?: string;
  readonly deploymentId?: UUID;
  readonly blueprintId?: RegistryId;
  readonly extensionPointId?: RegistryId;
  readonly blockId?: RegistryId;
  readonly extensionId?: UUID;
  readonly serviceId?: RegistryId;
  readonly authId?: UUID;
};

export type SerializedError = Primitive | ErrorObject;

export type Data = Record<string, unknown>;

export interface Logger {
  readonly context: MessageContext;
  /**
   * Return a new child logger with additional message context
   */
  childLogger: (additionalContext: MessageContext) => Logger;
  trace: (msg: string, data?: Data) => void;
  warn: (msg: string, data?: Data) => void;
  debug: (msg: string, data?: Data) => void;
  log: (msg: string, data?: Data) => void;
  info: (msg: string, data?: Data) => void;
  error: (error: unknown, data?: Data) => void;
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

export type BlockIcon = string;

/**
 * Metadata about a block, extension point, or service
 */
export interface Metadata {
  readonly id: RegistryId;
  readonly name: string;
  readonly version?: string;
  readonly description?: string;

  /**
   * @deprecated experimental prop that will likely be removed in the future
   */
  readonly icon?: BlockIcon;

  /**
   * @deprecated experimental prop that will likely be removed in the future
   */
  readonly author?: string;
}

export interface Sharing {
  readonly public: boolean;
  readonly organizations: string[];
}

export function selectMetadata(metadata: Metadata): Metadata {
  return pick(metadata, ["id", "name", "version", "description"]);
}

export type Config = Record<string, unknown>;

export type EmptyConfig = Record<never, unknown>;

export type InnerDefinitions = Record<string, Config>;

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

export type ServiceLocator = (
  serviceId: RegistryId,
  configurationId?: UUID
) => Promise<SanitizedServiceConfiguration>;

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

export interface DeploymentContext {
  id: UUID;
  timestamp: string;
}

export type ExtensionRef = {
  /**
   * UUID of the extension.
   */
  extensionId: UUID;

  /**
   * Registry id of the extension point.
   */
  extensionPointId: RegistryId;
};

export type IExtension<T extends Config = EmptyConfig> = {
  /**
   * UUID of the extension.
   */
  id: UUID;

  /**
   * The PixieBrix brick definition API version, controlling how the runtime interprets configuration values.
   * @see ApiVersion
   */
  apiVersion: ApiVersion;

  /**
   * Registry id of the extension point, or a reference to the definitions section.
   */
  extensionPointId: RegistryId | InnerDefinitionRef;

  /**
   * Metadata about the deployment used to install the extension, or `undefined` if the extension was not installed
   * via a deployment.
   */
  _deployment?: DeploymentContext;

  /**
   * Metadata about the recipe used to install the extension, or `undefined` if the user created this extension
   * directly.
   */
  _recipe: Metadata | undefined;

  /**
   * A human-readable label for the extension.
   */
  label: string | null;

  /**
   * Default template engine when running the extension.
   */
  templateEngine?: TemplateEngine;

  /**
   * Additional permissions, e.g., origins to perform effects on after opening a tab.
   */
  permissions?: Permissions.Permissions;

  /**
   * Inner/anonymous definitions used by the extension.
   *
   * Supported definitions:
   * - extension points
   * - components
   * - readers
   *
   * @see ResolvedExtension
   */
  definitions?: InnerDefinitions;

  /**
   * Configured services/integrations for the extension.
   */
  services?: ServiceDependency[];

  /**
   * Options the end-user has configured (i.e., during blueprint activation)
   */
  optionsArgs?: UserOptions;

  /**
   * The extension configuration for the extension point.
   */
  config: T;

  /**
   * True iff the extension is activated in the client
   *
   * For extensions on the server, but not activated on the client, this will be false.
   */
  active?: boolean;
};

/**
 * An extension that has been saved locally.
 * @see IExtension
 * @see UserExtension
 */
export type PersistedExtension<
  T extends Config = EmptyConfig
> = IExtension<T> & {
  /**
   * True to indicate this extension has been activated on the client.
   */
  active: true;

  /**
   * Creation timestamp in ISO format with timezone.
   *
   * Currently not used for anything - might be used for sorting, etc. in the future.
   */
  createTimestamp: string;

  /**
   * Update timestamp in ISO format with timezone.
   *
   * Used to determine if local version is outdated compared to user's version on the server.
   */
  updateTimestamp: string;
};

/**
 * An `IExtension` with all definitions resolved.
 */
export type ResolvedExtension<T extends Config = EmptyConfig> = Except<
  IExtension<T>,
  "definitions"
> & {
  /**
   * The registry id of the extension point (will be an `@internal` scope, if the extension point was originally defined
   * internally.
   */
  extensionPointId: RegistryId;

  _resolvedExtensionBrand: never;
};

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
  addExtension(extension: ResolvedExtension): void;

  /**
   * Sync registered extensions, removing any extensions that aren't provided here. Does not actually install/run
   * the extensions.
   */
  syncExtensions(extensions: ResolvedExtension[]): void;

  /**
   * Run the installed extensions for extension point.
   */
  run(): Promise<void>;

  /**
   * Returns any blocks configured in extension.
   */
  getBlocks: (extension: ResolvedExtension) => Promise<IBlock[]>;
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

  /**
   * Returns true iff the block is guaranteed to be side-effect free, (i.e., it can be safely re-run).
   *
   * Defined as a promise to support blocks that refer to other blocks (and therefore need to look up the status of
   * the other blocks to resolve their purity).
   *
   * FIXME: isPure is marked as optional because we're using IBlock to represent packages/bricks in some places, e.g.,
   *  the BrickModal. We need to make this require and fix the types in the places that break. For example, some places
   *  take advantages the IExtensionPoint is compatible with the the IBlock interface even though they represent two
   *  different concepts
   *
   * Examples of impure actions:
   * - Calling an API
   * - Showing a prompt
   * - Writing to the session state
   */
  isPure?: () => Promise<boolean>;

  /**
   * (Optional) default root output key to use when this block is added in the page editor.
   *
   * If not provided, the Page Editor will use a generic name, potentially based on the inferred type of the brick.
   *
   * For example, "foo" will produce: foo, foo2, foo3, foo4, etc.
   */
  defaultOutputKey?: string;

  run: (value: BlockArg, options: BlockOptions) => Promise<unknown>;
}

export type ReaderOutput = Record<string, unknown>;

/**
 * A block that can read data from a page or part of the page.
 */
export interface IReader extends IBlock {
  /** Return true if the Reader is for a page/element. */
  isAvailable: ($elt?: JQuery) => Promise<boolean>;

  read: (root: ReaderRoot) => Promise<ReaderOutput>;
}

export type KeyedConfig = Record<string, string | null>;

export type SanitizedConfig = KeyedConfig & {
  /**
   * Nominal typing to distinguish from `ServiceConfig`
   * @see `ServiceConfig`
   */
  _sanitizedConfigBrand: null;
};

export type ServiceConfig = KeyedConfig & {
  /**
   * Nominal typing to distinguish from SanitizedConfig
   * @see `SanitizedConfig`
   */
  _serviceConfigBrand: null;
};

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
  [key: string]: string | null;
}

export interface TokenContext {
  url: string;
  data: Config;
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
  id: UUID | undefined;

  /**
   * Registry identifier for the service, e.g., `@pixiebrix/api`.
   */
  serviceId: ServiceId;

  /**
   * Human-readable label for the configuration to distinguish it from other configurations for the same service in the
   * interface.
   */
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
   * UUID of the service configuration.
   */
  id?: UUID;

  /**
   * Registry identifier for the service, e.g., @pixiebrix/api
   */
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

export type UserOptions = Record<string, Primitive>;

// Nice-to-have: add nominal typing to distinguish rendered vs. non-rendered args
export type RenderedArgs = Record<string, unknown>;

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

  /**
   * List of feature flags enabled for the user.
   */
  readonly flags: string[];
}

export type RawConfig = {
  kind: "service" | "extensionPoint" | "component" | "reader" | "recipe";
  metadata: Metadata;
};

export function isReader(block: IBlock): block is IReader {
  return "read" in block;
}

export function isRendererBlock(
  // eslint-disable-next-line @typescript-eslint/ban-types -- typing enforced by other interfaces
  block: IBlock & { render?: Function }
): boolean {
  return typeof block.render === "function";
}

// eslint-disable-next-line @typescript-eslint/ban-types -- typing enforced by other interfaces
export function isEffectBlock(block: IBlock & { effect?: Function }): boolean {
  return typeof block.effect === "function";
}

/**
 * Brick is an inclusive term for entities with an id + version.
 */
export type IBrick = IBlock | IService | IExtensionPoint;
