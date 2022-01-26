/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
  EmptyConfig,
  BlockArg,
  BlockIcon,
  BlockOptions,
  IBlock,
  IExtensionPoint,
  IReader,
  IService,
  Logger,
  OAuth2Context,
  AuthData,
  ReaderOutput,
  Schema,
  TokenContext,
  KeyedConfig,
  RegistryId,
  ResolvedExtension,
  UUID,
  RendererOutput,
} from "@/core";
import { AxiosRequestConfig } from "axios";
import { BackgroundLogger } from "@/background/logging";
import { Permissions } from "webextension-polyfill";
import { validateRegistryId } from "@/types/helpers";

type SanitizedBrand = { _sanitizedConfigBrand: null };
type SecretBrand = { _serviceConfigBrand: null };

/**
 * Type to be preferred over a plain `object`
 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md
 */
export type UnknownObject = Record<string, unknown>;

export abstract class Service<
  TConfig extends KeyedConfig = KeyedConfig,
  TOAuth extends AuthData = AuthData
> implements IService<TConfig> {
  id: RegistryId;

  name: string;

  description?: string;

  icon?: BlockIcon;

  abstract schema: Schema;

  abstract hasAuth: boolean;

  abstract get isOAuth2(): boolean;

  abstract get isToken(): boolean;

  protected constructor(
    id: RegistryId,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
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

export abstract class ExtensionPoint<TConfig extends EmptyConfig>
  implements IExtensionPoint {
  public readonly id: RegistryId;

  public readonly name: string;

  public readonly description: string;

  public readonly icon: BlockIcon;

  protected readonly extensions: Array<ResolvedExtension<TConfig>> = [];

  protected readonly template?: string;

  public abstract readonly inputSchema: Schema;

  protected readonly logger: Logger;

  public get syncInstall() {
    return false;
  }

  /**
   * Permissions required to use this extensions
   * https://developer.chrome.com/extensions/permission_warnings
   */
  public abstract readonly permissions: Permissions.Permissions;

  public get defaultOptions(): Record<string, unknown> {
    return {};
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    this.id = validateRegistryId(id);
    this.name = name;
    this.description = description;
    this.icon = icon;
    this.logger = new BackgroundLogger({ extensionPointId: this.id });
  }

  /**
   * Internal method to unregister extension's triggers/observers/etc. from the page.
   *
   * When this method is called, the extensions will still be in this.extensions. The caller is responsible for
   * updating this.extensions after the call to removeExtensions
   */
  protected abstract removeExtensions(extensionIds: UUID[]): void;

  syncExtensions(extensions: Array<ResolvedExtension<TConfig>>): void {
    const before = this.extensions.map((x) => x.id);

    const updatedIds = new Set(extensions.map((x) => x.id));
    const removed = this.extensions.filter(
      (currentExtension) => !updatedIds.has(currentExtension.id)
    );
    this.removeExtensions(removed.map((x) => x.id));

    // Clear extensions and re-populate with updated extensions
    this.extensions.splice(0, this.extensions.length);
    this.extensions.push(...extensions);

    console.debug("syncExtensions for extension point %s", this.id, {
      before,
      after: extensions.map((x) => x.id),
      removed: removed.map((x) => x.id),
    });
  }

  addExtension(extension: ResolvedExtension<TConfig>): void {
    const index = this.extensions.findIndex((x) => x.id === extension.id);
    if (index >= 0) {
      console.warn(
        `Extension ${extension.id} already registered for the extension point ${this.id}`
      );
      // Index is guaranteed to be a number, and this.extensions is an array
      // eslint-disable-next-line security/detect-object-injection
      this.extensions[index] = extension;
    } else {
      this.extensions.push(extension);
    }
  }

  abstract defaultReader(): Promise<IReader>;

  abstract getBlocks(extension: ResolvedExtension<TConfig>): Promise<IBlock[]>;

  abstract isAvailable(): Promise<boolean>;

  abstract install(): Promise<boolean>;

  uninstall(_options?: { global?: boolean }): void {
    console.warn(`Uninstall not implemented for extension point: ${this.id}`);
  }

  abstract run(): Promise<void>;
}

export abstract class Block implements IBlock {
  readonly id: RegistryId;

  readonly name: string;

  readonly description: string;

  readonly icon: BlockIcon;

  abstract readonly inputSchema: Schema;

  readonly outputSchema?: Schema = undefined;

  readonly permissions = {};

  readonly defaultOptions = {};

  async isPure(): Promise<boolean> {
    // Safe default
    return false;
  }

  async isRootAware(): Promise<boolean> {
    // Safe default
    return true;
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    this.id = validateRegistryId(id);
    this.name = name;
    this.description = description;
    this.icon = icon;
  }

  abstract run(value: BlockArg, options: BlockOptions): Promise<unknown>;
}

export abstract class Effect extends Block {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    super(id, name, description, icon);
  }

  async isRootAware(): Promise<boolean> {
    // Most effects don't use the root, so have them opt-in
    return false;
  }

  abstract effect(inputs: BlockArg, env?: BlockOptions): Promise<void>;

  async run(value: BlockArg, options: BlockOptions): Promise<void> {
    return this.effect(value, options);
  }
}

export abstract class Transformer extends Block {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    super(id, name, description, icon);
  }

  async isRootAware(): Promise<boolean> {
    // Most transformers don't use the root, so have them opt-in
    return false;
  }

  abstract transform(value: BlockArg, options: BlockOptions): Promise<unknown>;

  async run(value: BlockArg, options: BlockOptions): Promise<unknown> {
    return this.transform(value, options);
  }
}

export abstract class Renderer extends Block {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    super(id, name, description, icon);
  }

  abstract render(
    inputs: BlockArg,
    options: BlockOptions
  ): Promise<RendererOutput>;

  async isRootAware(): Promise<boolean> {
    // Most renderers don't use the root, so have them opt-in
    return false;
  }

  async run(value: BlockArg, options: BlockOptions): Promise<RendererOutput> {
    return this.render(value, options);
  }
}

export abstract class Reader extends Block implements IReader {
  readonly inputSchema: Schema = {};

  outputSchema: Schema = undefined;

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    super(id, name, description, icon);
  }

  async isRootAware(): Promise<boolean> {
    // Most readers use the root, so have them opt-out if they don't
    return true;
  }

  abstract isAvailable($elt?: JQuery): Promise<boolean>;

  abstract read(root: HTMLElement | Document): Promise<ReaderOutput>;

  async run({ root }: BlockArg): Promise<ReaderOutput> {
    return this.read(root);
  }
}

export type Target = {
  tabId: number;
  frameId: number;
};
