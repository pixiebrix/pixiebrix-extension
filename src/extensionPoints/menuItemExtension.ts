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
import { checkAvailable } from "@/blocks/available";
import castArray from "lodash/castArray";
import identity from "lodash/identity";
import { engineRenderer } from "@/helpers";
import {
  reducePipeline,
  mergeReaders,
  blockList,
  BlockConfig,
  BlockPipeline,
  makeServiceContext,
} from "@/blocks/combinators";
import { reportError } from "@/telemetry/logging";
import {
  awaitElementOnce,
  acquireElement,
  onNodeRemoved,
} from "@/extensionPoints/helpers";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import {
  IBlock,
  IExtension,
  IExtensionPoint,
  ReaderOutput,
  Schema,
  IconConfig,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { Permissions } from "webextension-polyfill-ts";

interface MenuItemExtensionConfig {
  caption: string;
  action: BlockConfig | BlockPipeline;
  icon?: IconConfig;
}

export abstract class MenuItemExtensionPoint extends ExtensionPoint<
  MenuItemExtensionConfig
> {
  protected readonly menus: Map<string, HTMLElement>;
  public get defaultOptions(): { caption: string } {
    return { caption: "Custom Menu Item" };
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faMousePointer"
  ) {
    super(id, name, description, icon);
    this.menus = new Map<string, HTMLElement>();
  }

  inputSchema: Schema = propertiesToSchema(
    {
      caption: {
        type: "string",
        description: "The caption for the menu item.",
      },
      action: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/effect#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
    },
    ["caption", "action"]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getReaderRoot($containerElement: JQuery): HTMLElement | Document {
    return document;
  }

  getTemplate(): string {
    if (this.template) return this.template;
    throw new Error("MenuItemExtensionPoint.getTemplate not implemented");
  }

  getContainerSelector(): string | string[] {
    throw new Error(
      "MenuItemExtensionPoint.getContainerSelector not implemented"
    );
  }

  addMenuItem($menu: JQuery, $menuItem: JQuery): void {
    $menu.append($menuItem);
  }

  getBlocks(extension: IExtension<MenuItemExtensionConfig>): IBlock[] {
    return blockList(extension.config.action);
  }

  async install(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }

    const selector = this.getContainerSelector();

    console.debug(`Awaiting menu container for ${this.id}: ${selector}`);

    const $menu = (await awaitElementOnce(selector)) as JQuery<HTMLElement>;

    const acquired = $menu
      .map((index, element) => {
        const uuid = uuidv4();
        this.menus.set(uuid, element);
        return acquireElement($(element), this.id, () => {
          console.debug(
            `Menu ${uuid} removed from DOM for ${this.id}: ${selector}`
          );
          this.menus.delete(uuid);
        });
      })
      .get();

    return acquired.some(identity);
  }

  private async runExtension(
    menu: HTMLElement,
    ctxt: ReaderOutput,
    extension: IExtension<MenuItemExtensionConfig>
  ) {
    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });
    console.debug(`Running extension ${extension.id}`);

    const $menu = $(menu);

    const {
      caption,
      action: actionConfig,
      icon = { id: "box", size: 18 },
    } = extension.config;

    const $existingItem = $menu.find(`[data-pixiebrix-uuid="${extension.id}"]`);

    const serviceContext = await makeServiceContext(extension.services);
    const renderTemplate = engineRenderer(extension.templateEngine);
    const extensionContext = { ...ctxt, ...serviceContext };

    console.debug("Extension context", { serviceContext, ctxt });

    const iconAsSVG = (
      await import(
        /* webpackChunkName: "icons" */
        "@/icons/svgIcons"
      )
    ).default;

    const $menuItem = $(
      Mustache.render(this.getTemplate(), {
        caption: renderTemplate(caption, extensionContext),
        icon: iconAsSVG(icon),
      })
    );

    $menuItem.attr("data-pixiebrix-uuid", extension.id);

    $menuItem.on("click", async (e) => {
      e.preventDefault();

      try {
        // read latest state at the time of the action
        const reader = this.defaultReader();
        const ctxt = await reader.read(this.getReaderRoot($menu));

        await reducePipeline(actionConfig, ctxt, extensionLogger, {
          validate: true,
          serviceArgs: serviceContext,
        });

        extensionLogger.info("Successfully ran menu action");

        $.notify(`Successfully ran menu action`, { className: "success" });
      } catch (ex) {
        // eslint-disable-next-line require-await
        extensionLogger.error(ex);
        $.notify(`Error running menu action: ${ex}`, { className: "error" });
      }
    });

    if ($existingItem.length) {
      // shouldn't need to unbind click handlers because we'll replace it outright
      console.debug(`Replacing existing menu item for ${extension.id}`);
      $existingItem.replaceWith($menuItem);
    } else {
      console.debug(`Adding new menu item ${extension.id}`);
      this.addMenuItem($menu, $menuItem);
    }

    onNodeRemoved($menuItem.get(0), () => {
      console.debug(`Menu item for ${extension.id} was removed from the DOM`);
    });
  }

  async run(): Promise<void> {
    if (!this.menus.size || !this.extensions.length) {
      return;
    }

    for (const menu of this.menus.values()) {
      const reader = this.defaultReader();
      const ctxt = await reader.read(this.getReaderRoot($(menu)));

      if (ctxt == null) {
        throw new Error(`Reader ${reader.id} returned null/undefined`);
      }

      const errors = [];

      for (const extension of this.extensions) {
        // Run in order so that the order stays the same for where they get rendered. The service
        // context is the only thing that's async as part of the initial configuration right now
        try {
          await this.runExtension(menu, ctxt, extension);
        } catch (ex) {
          // eslint-disable-next-line require-await
          reportError(ex, {
            extensionPointId: extension.extensionPointId,
            extensionId: extension.id,
          });
          errors.push(ex);
        }
      }

      if (errors.length) {
        $.notify(`An error occurred adding ${errors.length} menu item(s)`, {
          className: "error",
        });
      }
    }
  }
}

interface MenuDefaultOptions {
  caption?: string;
  [key: string]: string;
}

interface MenuDefinition extends ExtensionPointDefinition {
  template: string;
  position?: "append" | "prepend";
  containerSelector: string;
  readerSelector: string;
  defaultOptions: MenuDefaultOptions;
}

class RemoteMenuItemExtensionPoint extends MenuItemExtensionPoint {
  private readonly _definition: MenuDefinition;
  public readonly permissions: Permissions.Permissions;

  public get defaultOptions(): {
    caption: string;
    [key: string]: string;
  } {
    const { caption, ...defaults } = this._definition.defaultOptions ?? {};
    return {
      caption: caption ?? super.defaultOptions.caption,
      ...defaults,
    };
  }

  constructor(config: ExtensionPointConfig<MenuDefinition>) {
    const { id, name, description, icon } = config.metadata;
    super(id, name, description, icon);
    this._definition = config.definition;
    const { isAvailable } = config.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  addMenuItem($menu: JQuery, $menuItem: JQuery): void {
    const { position = "append" } = this._definition;
    switch (position) {
      case "prepend":
      case "append": {
        $menu[position]($menuItem);
        break;
      }
      default: {
        throw new Error(`Unexpected position ${position}`);
      }
    }
  }

  getReaderRoot($containerElement: JQuery): HTMLElement | Document {
    const selector = this._definition.readerSelector;
    if (selector) {
      const $elt = $($containerElement).parents(selector);
      if ($elt.length > 1) {
        throw new Error(
          `Found multiple elements for reader selector: ${selector}`
        );
      } else if ($elt.length === 0) {
        throw new Error(`Found no elements for  reader selector: ${selector}`);
      }
      return $elt.get(0);
    } else {
      return document;
    }
  }

  defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  getContainerSelector() {
    return this._definition.containerSelector;
  }

  getTemplate(): string {
    return this._definition.template;
  }

  async isAvailable(): Promise<boolean> {
    return await checkAvailable(this._definition.isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<MenuDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "menuItem") {
    throw new Error(`Expected type=menuItem, got ${type}`);
  }
  return new RemoteMenuItemExtensionPoint(config);
}
