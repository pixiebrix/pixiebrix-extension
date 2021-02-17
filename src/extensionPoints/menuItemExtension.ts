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
import { castArray, compact } from "lodash";
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
  EXTENSION_POINT_DATA_ATTR,
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
import { reportEvent } from "@/telemetry/telemetry";

interface ShadowDOM {
  mode?: "open" | "closed";
  tag?: string;
}

export const DATA_ATTR = "data-pb-uuid";

export interface MenuItemExtensionConfig {
  caption: string;
  action: BlockConfig | BlockPipeline;
  icon?: IconConfig;
}

export const actionSchema: Schema = {
  oneOf: [
    { $ref: "https://app.pixiebrix.com/schemas/effect#" },
    {
      type: "array",
      items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
    },
  ],
};

export abstract class MenuItemExtensionPoint extends ExtensionPoint<MenuItemExtensionConfig> {
  protected readonly menus: Map<string, HTMLElement>;
  private readonly instanceId: string;
  private readonly removed: Set<string>;
  private readonly cancelPending: Set<() => void>;
  private uninstalled = false;

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
    this.instanceId = uuidv4();
    this.menus = new Map<string, HTMLElement>();
    this.removed = new Set<string>();
    this.cancelPending = new Set();
  }

  inputSchema: Schema = propertiesToSchema(
    {
      caption: {
        type: "string",
        description: "The caption for the menu item.",
      },
      action: actionSchema,
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
      shadowDOM: {
        type: "object",
        description:
          "When provided, renders the menu item as using the shadowDOM",
        properties: {
          tag: {
            type: "string",
          },
          mode: {
            type: "string",
            enum: ["open", "closed"],
            default: "closed",
          },
        },
        required: ["tag"],
      },
    },
    ["caption", "action"]
  );

  private cancelAllPending(): void {
    console.debug(
      `Cancelling ${this.cancelPending.size} menuItemExtension observers`
    );
    for (const cancelObserver of this.cancelPending) {
      try {
        cancelObserver?.();
      } catch (err) {
        // try to proceed as normal
        // noinspection JSIgnoredPromiseFromCall
        reportError(err, this.logger.context);
      }
    }
    this.cancelPending.clear();
  }

  public uninstall(): void {
    this.uninstalled = true;

    const menus = Array.from(this.menus.values());
    const extensions = Array.from(this.extensions);

    // clear so they don't get re-added by the onNodeRemoved mechanism
    this.extensions.splice(0, this.extensions.length);
    this.menus.clear();

    console.debug(
      `Uninstalling ${menus.length} menus for ${extensions.length} extensions`
    );

    this.cancelAllPending();

    for (const element of menus) {
      try {
        for (const extension of extensions) {
          const $item = $(element).find(`[${DATA_ATTR}="${extension.id}"]`);
          if (!$item.length) {
            console.debug(`Item for ${extension.id} was not in the menu`);
          }
          $item.remove();
        }
        // release the menu element
        element.removeAttribute(EXTENSION_POINT_DATA_ATTR);
      } catch (exc) {
        this.logger.error(exc);
      }
    }
  }

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

  async getBlocks(
    extension: IExtension<MenuItemExtensionConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  private async reacquire(uuid: string): Promise<void> {
    if (this.uninstalled) {
      console.warn(
        `${this.instanceId}: cannot reacquire because extension ${this.id} is destroyed`
      );
    }
    const alreadyRemoved = this.removed.has(uuid);
    this.removed.add(uuid);
    if (!alreadyRemoved) {
      console.debug(
        `${this.instanceId}: menu ${uuid} removed from DOM for ${this.id}`
      );
      this.menus.delete(uuid);
      // Re-install the menus (will wait for the menu selector to re-appear)
      await this.installMenus();
      await this.run();
    } else {
      console.warn(
        `${this.instanceId}: menu ${uuid} removed from DOM multiple times for ${this.id}`
      );
    }
  }

  private async installMenus(): Promise<boolean> {
    if (this.uninstalled) {
      console.error(`Menu item extension is uninstalled`, {
        extensionId: this.instanceId,
      });
      throw new Error(
        `Cannot install menu item because it was already uninstalled`
      );
    }

    const selector = this.getContainerSelector();

    console.debug(
      `${this.instanceId}: awaiting menu container for ${this.id}: ${selector}`
    );

    const [menuPromise, cancelWait] = await awaitElementOnce(selector);
    this.cancelPending.add(cancelWait);

    const $menu = (await menuPromise) as JQuery<HTMLElement>;

    const acquired = compact(
      $menu
        .map((index, element) => {
          const uuid = uuidv4();
          this.menus.set(uuid, element);
          return acquireElement(element, this.id, () => this.reacquire(uuid));
        })
        .get()
    );

    for (const cancelObserver of acquired) {
      this.cancelPending.add(cancelObserver);
    }

    return acquired.length > 0;
  }

  async install(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }
    return this.installMenus();
  }

  protected abstract makeItem(
    html: string,
    extension: IExtension<MenuItemExtensionConfig>
  ): JQuery<HTMLElement>;

  private async runExtension(
    menu: HTMLElement,
    ctxt: ReaderOutput,
    extension: IExtension<MenuItemExtensionConfig>
  ) {
    if (!extension.id) {
      this.logger.error(`Refusing to run extension without id for ${this.id}`);
      return;
    }

    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });
    console.debug(
      `${this.instanceId}: running menuItem extension ${extension.id}`
    );

    const $menu = $(menu);

    const {
      caption,
      action: actionConfig,
      icon = { id: "box", size: 18 },
    } = extension.config;

    const serviceContext = await makeServiceContext(extension.services);
    const renderTemplate = engineRenderer(extension.templateEngine);
    const extensionContext = { ...ctxt, ...serviceContext };

    const iconAsSVG = icon
      ? (
          await import(
            /* webpackChunkName: "icons" */
            "@/icons/svgIcons"
          )
        ).default
      : null;

    const html = Mustache.render(this.getTemplate(), {
      caption: renderTemplate(caption, extensionContext),
      icon: iconAsSVG?.(icon),
    });

    const $menuItem = this.makeItem(html, extension);

    $menuItem.on("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.debug(`Run menu item`, this.logger.context);

      reportEvent("MenuItemClick", { extensionId: extension.id });

      try {
        // read latest state at the time of the action
        const reader = await this.defaultReader();
        const ctxt = await reader.read(this.getReaderRoot($menu));

        await reducePipeline(actionConfig, ctxt, extensionLogger, document, {
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

    const $existingItem = $menu.find(`[${DATA_ATTR}="${extension.id}"]`);

    if ($existingItem.length) {
      // shouldn't need to unbind click handlers because we'll replace it outright
      console.debug(`Replacing existing menu item for ${extension.id}`);
      $existingItem.replaceWith($menuItem);
    } else {
      console.debug(`Adding new menu item ${extension.id}`);
      this.addMenuItem($menu, $menuItem);
    }

    if (process.env.DEBUG) {
      const cancelObserver = onNodeRemoved($menuItem.get(0), () => {
        // Don't re-install here. We're reinstalling the entire menu
        console.debug(`Menu item for ${extension.id} was removed from the DOM`);
      });
      this.cancelPending.add(cancelObserver);
    }
  }

  async run(): Promise<void> {
    if (!this.menus.size || !this.extensions.length) {
      return;
    }

    const errors = [];

    for (const menu of this.menus.values()) {
      const reader = await this.defaultReader();
      const ctxt = await reader.read(this.getReaderRoot($(menu)));

      if (ctxt == null) {
        throw new Error(`Reader ${reader.id} returned null/undefined`);
      }

      for (const extension of this.extensions) {
        // Run in order so that the order stays the same for where they get rendered. The service
        // context is the only thing that's async as part of the initial configuration right now
        try {
          await this.runExtension(menu, ctxt, extension);
        } catch (ex) {
          errors.push(ex);
          // noinspection ES6MissingAwait
          reportError(ex, {
            extensionPointId: extension.extensionPointId,
            extensionId: extension.id,
          });
        }
      }
    }

    if (errors.length) {
      console.warn(`An error occurred adding ${errors.length} menu item(s)`, {
        errors,
      });

      if (errors.length === 1) {
        $.notify(
          `An error occurred adding ${errors.length} menu item(s): ${errors[0]}`,
          {
            className: "error",
          }
        );
      } else {
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

export type MenuPosition =
  | "append"
  | "prepend"
  | {
      // element to insert the menu item before, selector is relative to the container
      sibling: string | null;
    };

export interface MenuDefinition extends ExtensionPointDefinition {
  type: "menuItem";
  template: string;
  position?: MenuPosition;
  containerSelector: string;
  readerSelector?: string;
  defaultOptions?: MenuDefaultOptions;
  shadowDOM?: ShadowDOM;
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

    if (typeof position === "object") {
      if (position.sibling) {
        const $sibling = $menu.find(position.sibling);
        if ($sibling.length > 1) {
          throw new Error(
            `Multiple sibling elements for selector: ${position.sibling}`
          );
        } else if ($sibling.length === 1) {
          $sibling.before($menuItem);
        } else {
          // didn't find the sibling, so just try inserting it at the end
          $menu.append($menuItem);
        }
      } else {
        // no element to insert the item before, so insert it at the end.
        $menu.append($menuItem);
      }
    } else {
      switch (position) {
        case "prepend":
        case "append": {
          // safe because we're checking the value in the case statements
          // eslint-disable-next-line security/detect-object-injection
          $menu[position]($menuItem);
          break;
        }
        default: {
          throw new Error(`Unexpected position ${position}`);
        }
      }
    }
  }

  getReaderRoot($containerElement: JQuery): HTMLElement | Document {
    const selector = this._definition.readerSelector;
    if (selector) {
      if ($containerElement.length > 1) {
        console.warn("getReaderRoot called with multiple containerElements");
      }
      const $elt = $containerElement.parents(selector);
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

  protected makeItem(
    html: string,
    extension: IExtension<MenuItemExtensionConfig>
  ): JQuery<HTMLElement> {
    let $root: JQuery<HTMLElement>;

    if (this._definition.shadowDOM) {
      const root = document.createElement(this._definition.shadowDOM.tag);
      const shadowRoot = root.attachShadow({ mode: "closed" });
      shadowRoot.innerHTML = html;
      $root = $(root);
    } else {
      $root = $(html);
    }

    $root.attr(DATA_ATTR, extension.id);

    return $root;
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
