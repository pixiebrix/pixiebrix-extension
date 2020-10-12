import {
  BaseExtensionConfig,
  BlockArg,
  BlockIcon,
  BlockOptions,
  IBlock,
  IExtension,
  IExtensionPoint,
  IPermissions,
  IReader,
  IService,
  RenderedHTML,
  Schema,
  ServiceConfig,
} from "./core";
import { AxiosRequestConfig } from "axios";

export abstract class Service<TConfig extends ServiceConfig = ServiceConfig>
  implements IService<TConfig> {
  id: string;
  name: string;
  description?: string;
  icon?: BlockIcon;
  abstract schema: Schema;
  abstract hasAuth: boolean;

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

  abstract authenticateRequest(
    serviceConfig: TConfig,
    requestConfig: AxiosRequestConfig
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

  /**
   * Permissions required to use this extensions
   * https://developer.chrome.com/extensions/permission_warnings
   */
  public abstract readonly permissions: IPermissions = {};

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
  }

  addExtension(extension: IExtension<TConfig>): void {
    this.extensions.push(extension);
  }

  abstract defaultReader(): IReader;

  abstract getBlocks(extension: IExtension<TConfig>): IBlock[];

  abstract async isAvailable(): Promise<boolean>;

  abstract async install(): Promise<boolean>;

  abstract async run(): Promise<void>;
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

  abstract async run(value: BlockArg, options: BlockOptions): Promise<unknown>;
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

  abstract async effect(inputs: BlockArg, env?: BlockOptions): Promise<void>;

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

  abstract async transform(
    value: BlockArg,
    options: BlockOptions
  ): Promise<unknown>;

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

  abstract async render(
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

  abstract async isAvailable($elt?: JQuery): Promise<boolean>;

  abstract async read($elt?: JQuery): Promise<{ [key: string]: unknown }>;

  async run(): Promise<unknown> {
    return this.read();
  }
}
