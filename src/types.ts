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

import {
  BaseExtensionConfig,
  BlockArg,
  BlockIcon,
  BlockOptions,
  IBlock,
  IExtension,
  IExtensionPoint,
  IReader,
  IService,
  Logger,
  OAuth2Context,
  AuthData,
  ReaderOutput,
  RenderedHTML,
  Schema,
  TokenContext,
  KeyedConfig,
} from "./core";
import { AxiosRequestConfig } from "axios";
import { BackgroundLogger } from "@/background/logging";
import { partition } from "lodash";
import { Permissions } from "webextension-polyfill-ts";

type SanitizedBrand = { _sanitizedConfigBrand: null };
type SecretBrand = { _serviceConfigBrand: null };

export abstract class Service<
  TConfig extends KeyedConfig = KeyedConfig,
  TOAuth extends AuthData = AuthData
> implements IService<TConfig> {
  id: string;
  name: string;
  description?: string;
  icon?: BlockIcon;
  abstract schema: Schema;
  abstract hasAuth: boolean;
  abstract isOAuth2: boolean;
  abstract isToken: boolean;

  protected constructor(
    id: string,
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

export abstract class ExtensionPoint<TConfig extends BaseExtensionConfig>
  implements IExtensionPoint {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly icon: BlockIcon;
  protected readonly extensions: IExtension<TConfig>[] = [];
  protected readonly template?: string;
  public abstract readonly inputSchema: Schema;
  protected readonly logger: Logger;
  public readonly syncInstall: boolean = false;

  /**
   * Permissions required to use this extensions
   * https://developer.chrome.com/extensions/permission_warnings
   */
  public abstract readonly permissions: Permissions.Permissions = {};

  public get defaultOptions(): { [key: string]: unknown } {
    return {};
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
    this.logger = new BackgroundLogger({ extensionPointId: this.id });
  }

  /** Internal method to perform a partial uninstall of the extension point */
  protected abstract removeExtensions(extensionIds: string[]): void;

  syncExtensions(extensions: IExtension<TConfig>[]): void {
    const before = this.extensions.map((x) => x.id);

    const updatedIds = new Set(extensions.map((x) => x.id));
    const [, removed] = partition(this.extensions, (currentExtension) =>
      updatedIds.has(currentExtension.id)
    );
    this.removeExtensions(removed.map((x) => x.id));

    // clear extensions and re-populate with updated extensions
    this.extensions.splice(0, this.extensions.length);
    this.extensions.push(...extensions);

    console.debug(`syncExtensions for extension point %s`, this.id, {
      before,
      after: extensions.map((x) => x.id),
      removed: removed.map((x) => x.id),
    });
  }

  addExtension(extension: IExtension<TConfig>): void {
    const index = this.extensions.findIndex((x) => x.id === extension.id);
    if (index >= 0) {
      console.warn(
        `Extension ${extension.id} already registered for the extension point ${this.id}`
      );
      // index is guaranteed to be a number, and this.extensions is an array
      // eslint-disable-next-line security/detect-object-injection
      this.extensions[index] = extension;
    } else {
      this.extensions.push(extension);
    }
  }

  abstract defaultReader(): Promise<IReader>;

  abstract getBlocks(extension: IExtension<TConfig>): Promise<IBlock[]>;

  abstract isAvailable(): Promise<boolean>;

  abstract install(): Promise<boolean>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  uninstall(options?: { global?: boolean }): void {
    console.warn(`Uninstall not implemented for extension point: ${this.id}`);
  }

  abstract run(): Promise<void>;
}

export abstract class Block implements IBlock {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: BlockIcon;

  abstract readonly inputSchema: Schema;
  readonly outputSchema?: Schema = undefined;

  readonly permissions = {};
  readonly defaultOptions = {};

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon?: BlockIcon
  ) {
    this.id = id;
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
  ): Promise<RenderedHTML>;

  async run(value: BlockArg, options: BlockOptions): Promise<RenderedHTML> {
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

  abstract isAvailable($elt?: JQuery): Promise<boolean>;

  abstract read(root: HTMLElement | Document): Promise<ReaderOutput>;

  async run({ root }: { root: HTMLElement | Document }): Promise<ReaderOutput> {
    return this.read(root);
  }
}
