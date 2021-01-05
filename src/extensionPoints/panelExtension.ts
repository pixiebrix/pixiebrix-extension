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

import { v4 as uuidv4 } from "uuid";
import { ExtensionPoint } from "@/types";
import Mustache from "mustache";
import { errorBoundary } from "@/blocks/renderers/common";
import { checkAvailable } from "@/blocks/available";
import { castArray } from "lodash";
import {
  reducePipeline,
  mergeReaders,
  blockList,
  BlockConfig,
  BlockPipeline,
  makeServiceContext,
} from "@/blocks/combinators";
import { boolean } from "@/utils";
import { awaitElementOnce, acquireElement } from "@/extensionPoints/helpers";
import {
  IBlock,
  IExtension,
  IExtensionPoint,
  IReader,
  ReaderOutput,
  Schema,
} from "@/core";
import {
  ExtensionPointDefinition,
  ExtensionPointConfig,
} from "@/extensionPoints/types";
import { propertiesToSchema } from "@/validators/generic";
import { render } from "@/extensionPoints/dom";
import { Permissions } from "webextension-polyfill-ts";

export interface PanelConfig {
  heading?: string;
  body: BlockConfig | BlockPipeline;
  collapsible?: boolean;
  shadowDOM?: boolean;
}

const PIXIEBRIX_DATA_ATTR = "data-pb-uuid";

/**
 * Extension point that adds a panel to a web page.
 */
export abstract class PanelExtensionPoint extends ExtensionPoint<PanelConfig> {
  protected template?: string;
  protected $container: JQuery;
  private readonly collapsedExtensions: { [key: string]: boolean };
  private readonly cancelPending: Set<() => void>;
  private uninstalled = false;

  public get defaultOptions(): { heading: string } {
    return { heading: "Custom Panel" };
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faColumns"
  ) {
    super(id, name, description, icon);
    this.$container = null;
    this.collapsedExtensions = {};
    this.cancelPending = new Set();
  }

  inputSchema: Schema = propertiesToSchema(
    {
      heading: {
        type: "string",
        description: "The panel heading",
      },
      body: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/renderer#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
      shadowDOM: {
        type: "boolean",
        description: "Whether or not to use a shadow DOM for the body",
        default: true,
      },
      collapsible: {
        type: "boolean",
        description: "Whether or not the body is collapsible",
        default: false,
      },
    },
    ["heading", "body"]
  );

  async getBlocks(extension: IExtension<PanelConfig>): Promise<IBlock[]> {
    return blockList(extension.config.body);
  }

  async defaultReader(): Promise<IReader> {
    throw new Error("PanelExtensionPoint.defaultReader not implemented");
  }

  getTemplate(): string {
    if (this.template) return this.template;
    throw new Error("PanelExtensionPoint.getTemplate not implemented");
  }

  getContainerSelector(): string | string[] {
    throw new Error("PanelExtensionPoint.getContainerSelector not implemented");
  }

  async isAvailable(): Promise<boolean> {
    throw new Error("PanelExtensionPoint.isAvailable not implemented");
  }

  uninstall(): void {
    this.uninstalled = true;

    for (const extension of this.extensions) {
      const $item = this.$container.find(
        `[${PIXIEBRIX_DATA_ATTR}="${extension.id}"]`
      );
      if (!$item.length) {
        console.debug(`Panel for ${extension.id} was not in the menu`);
      }
      $item.remove();
    }

    this.$container = null;

    for (const cancel of this.cancelPending) {
      cancel();
    }

    this.cancelPending.clear();
  }

  async install(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.debug(
        `Skipping panel extension ${this.id} because it's not available for the page`
      );
      return false;
    }

    const selector = this.getContainerSelector();

    console.debug(`Awaiting panel container for ${this.id}: ${selector}`);

    const [containerPromise, cancelInstall] = awaitElementOnce(selector);
    this.cancelPending.add(cancelInstall);

    this.$container = (await containerPromise) as JQuery<HTMLElement>;

    if (this.$container.length == 0) {
      return false;
    } else if (this.$container.length > 1) {
      this.logger.error(`Multiple containers found: ${this.$container.length}`);
      return false;
    }

    const cancelWatchRemote = acquireElement(
      this.$container.get(0),
      this.id,
      () => {
        console.debug(`Container removed from DOM for ${this.id}: ${selector}`);
        this.$container = undefined;
      }
    );

    if (cancelWatchRemote) {
      this.cancelPending.add(cancelWatchRemote);
    }

    return !!cancelWatchRemote;
  }

  addPanel($panel: JQuery): void {
    this.$container.append($panel);
  }

  private async runExtension(
    readerContext: ReaderOutput,
    extension: IExtension<PanelConfig>
  ) {
    if (this.uninstalled) {
      throw new Error("panelExtension has already been destroyed");
    }

    const bodyUUID = uuidv4();
    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });

    const {
      body,
      heading,
      collapsible: rawCollapsible = false,
      shadowDOM: rawShadowDOM = true,
    } = extension.config;

    const collapsible = boolean(rawCollapsible);
    const shadowDOM = boolean(rawShadowDOM);

    const serviceContext = await makeServiceContext(extension.services);
    const extensionContext = { ...readerContext, ...serviceContext };

    const $panel = $(
      Mustache.render(this.getTemplate(), {
        heading: Mustache.render(heading, extensionContext),
        // render a placeholder body that we'll fill in async
        body: `<div id="${bodyUUID}"></div>`,
        bodyUUID,
      })
    );

    $panel.attr(PIXIEBRIX_DATA_ATTR, extension.id);

    const $existingPanel = this.$container.find(
      `[${PIXIEBRIX_DATA_ATTR}="${extension.id}"]`
    );

    if ($existingPanel.length) {
      console.debug(`Replacing existing panel for ${extension.id}`);
      $existingPanel.replaceWith($panel);
    } else {
      console.debug(`Adding new panel for ${extension.id}`);
      this.addPanel($panel);
    }

    // update the body content with the new args
    const $bodyContainer = this.$container.find(`#${bodyUUID}`);

    let isBodyInstalled = false;

    const installBody = () => {
      if (!isBodyInstalled) {
        isBodyInstalled = true;
        const rendererPromise = reducePipeline(
          body,
          readerContext,
          extensionLogger,
          document,
          {
            validate: true,
            serviceArgs: serviceContext,
          }
        ) as Promise<string>;

        errorBoundary(rendererPromise, extensionLogger).then(
          (bodyOrComponent) => {
            render($bodyContainer.get(0), bodyOrComponent, {
              shadowDOM: boolean(shadowDOM),
            });
            extensionLogger.debug("Successfully installed panel");
          }
        );
      }
    };

    if (collapsible) {
      const startExpanded = !this.collapsedExtensions[extension.id];

      if (startExpanded) {
        installBody();
      }

      $bodyContainer.addClass(["collapse"]);
      const $toggle = $panel.find('[data-toggle="collapse"]');

      $bodyContainer.toggleClass("show", startExpanded);
      $toggle.attr("aria-expanded", String(startExpanded));
      $toggle.toggleClass("active", startExpanded);

      $toggle.on("click", () => {
        $bodyContainer.toggleClass("show");
        const showing = $bodyContainer.hasClass("show");
        $toggle.attr("aria-expanded", String(showing));
        $toggle.toggleClass("active", showing);
        this.collapsedExtensions[extension.id] = !showing;
        if (showing) {
          installBody();
        }
      });
    } else {
      installBody();
    }
  }

  async run(): Promise<void> {
    if (!this.$container || !this.extensions.length) {
      return;
    }

    const reader = await this.defaultReader();
    const readerContext = await reader.read(document);

    if (readerContext == null) {
      throw new Error("Reader returned null/undefined");
    }

    const errors = [];

    for (const extension of this.extensions) {
      try {
        await this.runExtension(readerContext, extension);
      } catch (ex) {
        errors.push(ex);
        this.logger.childLogger({ extensionId: extension.id }).error(ex);
      }
    }

    if (errors.length) {
      $.notify(`An error occurred adding ${errors.length} panels(s)`, {
        className: "error",
      });
    }
  }
}

interface PanelDefaultOptions {
  heading?: string;
  [key: string]: string;
}

type PanelPosition =
  | "append"
  | "prepend"
  | {
      // element to insert the menu item before, selector is relative to the container
      sibling: string | null;
    };

export interface PanelDefinition extends ExtensionPointDefinition {
  template: string;
  position?: PanelPosition;
  containerSelector: string;
  defaultOptions?: PanelDefaultOptions;
}

class RemotePanelExtensionPoint extends PanelExtensionPoint {
  private readonly _definition: PanelDefinition;
  public readonly permissions: Permissions.Permissions;

  constructor(config: ExtensionPointConfig<PanelDefinition>) {
    const { id, name, description } = config.metadata;
    super(id, name, description);
    this._definition = config.definition;
    const { isAvailable } = config.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  public get defaultOptions(): {
    heading: string;
    [key: string]: string;
  } {
    const { heading, ...defaults } = this._definition.defaultOptions ?? {};
    return {
      heading: heading ?? super.defaultOptions.heading,
      ...defaults,
    };
  }

  async defaultReader(): Promise<IReader> {
    return await mergeReaders(this._definition.reader);
  }

  addPanel($panel: JQuery): void {
    const { position = "append" } = this._definition;

    if (typeof position !== "string") {
      throw new Error(`Expected string for panel position`);
    }

    switch (position) {
      case "prepend":
      case "append": {
        // safe because we're casing the method name
        // eslint-disable-next-line security/detect-object-injection
        this.$container[position]($panel);
        break;
      }
      default: {
        throw new Error(`Unexpected position: ${position}`);
      }
    }
  }

  getContainerSelector(): string {
    return this._definition.containerSelector;
  }

  getTemplate(): string {
    return this._definition.template;
  }

  async isAvailable(): Promise<boolean> {
    const { isAvailable } = this._definition;
    return await checkAvailable(isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<PanelDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "panel") {
    throw new Error(`Expected type=panel, got ${type}`);
  }
  return new RemotePanelExtensionPoint(config);
}
