import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { AxiosRequestConfig } from "axios";

export type TemplateEngine = "mustache" | "nunjucks" | "handlebars";

export type Schema = JSONSchema7;
export type SchemaDefinition = JSONSchema7Definition;
export type SchemaProperties = { [key: string]: SchemaDefinition };

export type RenderedHTML = string;

export interface Message {
  type: string;
  payload?: unknown;
}

export interface BlockOptions {
  ctxt: { [key: string]: unknown };
}

export type BlockArg = { [key: string]: any };

export interface IOption {
  value: any;
  label: string;
}

export interface IPermissions {
  // Same structure as Permissions from Chrome
  permissions?: string[];
  origins?: string[];
}

export type BlockIcon = string | IconDefinition;

/**
 * Metadata about a block, extension point, or service
 */
export interface Metadata {
  id: string;
  name: string;
  description?: string;
  icon?: BlockIcon;
  author?: string;
}

export type BaseExtensionConfig = {};

export interface ServiceDependency {
  id: string;
  outputKey: string;
  config?: string;
}

export type ServiceLocator = (
  serviceId: string,
  id?: string | null
) => Promise<ConfiguredService>;

export interface IExtension<
  T extends BaseExtensionConfig = BaseExtensionConfig
> {
  id: string;
  extensionPointId: string;
  label?: string;
  templateEngine?: TemplateEngine;
  services: ServiceDependency[];
  config: T;
}

export interface IExtensionPoint extends Metadata {
  inputSchema: Schema;

  permissions: IPermissions;

  defaultOptions: { [key: string]: unknown };

  defaultReader: () => IReader;

  isAvailable: () => Promise<boolean>;

  install(): Promise<boolean>;

  addExtension(extension: IExtension): void;

  run(locator: ServiceLocator): Promise<void>;

  /**
   * Returns any blocks configured in extension.
   */
  getBlocks: (extension: IExtension) => IBlock[];
}

export interface IBlock extends Metadata {
  /** A JSON schema of the inputs for the block */
  inputSchema: Schema;

  /** An optional a JSON schema for the output of the block */
  outputSchema?: Schema;

  defaultOptions: { [key: string]: any };

  /**
   * Returns the optional permissions required to run this block
   * https://developer.chrome.com/extensions/permission_warnings
   */
  permissions: IPermissions;

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

  read: ($elt?: JQuery) => Promise<ReaderOutput>;
}

type ServiceId = string;

export type ServiceConfig = { [key: string]: string | null | undefined };

/** Service configuration provided by a user. */
export interface RawServiceConfiguration {
  id: string | undefined;
  serviceId: ServiceId;
  label: string | undefined;
  config: ServiceConfig;
}

export type Authenticator = (
  requestConfig: AxiosRequestConfig
) => AxiosRequestConfig;

export interface ConfiguredService {
  serviceId: ServiceId;
  config: ServiceConfig;

  /**
   * true if the service must be proxied for remote configs, i.e., because it has a secret it needs
   * to use to authenticate.
   */
  proxy: boolean;

  authenticateRequest: Authenticator;
}

/**
 * A service that can be dependency injected and used to authenticate external requests.
 *
 * The input/output schema is the same since it's directly user configured.
 */
export interface IService extends Metadata {
  schema: Schema;

  authenticateRequest: (
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig
  ) => AxiosRequestConfig;
}
