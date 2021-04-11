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
import { castArray, compact, once } from "lodash";
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
  getErrorMessage,
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
import { reportEvent } from "@/telemetry/events";
import { hasCancelRootCause } from "@/errors";

interface ShadowDOM {
  mode?: "open" | "closed";
  tag?: string;
}

export const DATA_ATTR = "data-pb-uuid";

export interface MenuItemExtensionConfig {
  caption: string;
  if?: BlockConfig | BlockPipeline;
  dependencies?: string[];
  action: BlockConfig | BlockPipeline;
  icon?: IconConfig;
  dynamicCaption?: boolean;
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
  private readonly cancelDependencyObservers: Map<string, () => void>;
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
    this.cancelDependencyObservers = new Map<string, () => void>();
  }

  inputSchema: Schema = propertiesToSchema(
    {
      caption: {
        type: "string",
        description: "The caption for the menu item.",
      },
      dynamicCaption: {
        type: "boolean",
        description: "True if the caption can refer to data from the reader",
        default: "false",
      },
      if: actionSchema,
      dependencies: {
        type: "array",
        items: {
          type: "string",
        },
        minItems: 1,
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

  removeExtensions(extensionIds: string[]): void {
    console.debug(
      `Remove extensionIds for menuItem extension point: ${this.id}`,
      { extensionIds }
    );

    // can't use this.menus.values() here b/c because it may have already been cleared
    for (const extensionId of extensionIds) {
      const $item = $(document).find(`[${DATA_ATTR}="${extensionId}"]`);
      if ($item.length === 0) {
        console.warn(`Item for ${extensionId} was not in the menu`);
      }
      $item.remove();
    }
  }

  public uninstall(): void {
    this.uninstalled = true;

    const menus = Array.from(this.menus.values());

    // clear so they don't get re-added by the onNodeRemoved mechanism
    const extensions = this.extensions.splice(0, this.extensions.length);
    this.menus.clear();

    if (extensions.length === 0) {
      console.warn(
        `uninstall called on menu extension point with no extensions: ${this.id}`
      );
    }

    console.debug(
      `Uninstalling ${menus.length} menus for ${extensions.length} extensions`
    );

    this.cancelAllPending();

    for (const element of menus) {
      try {
        this.removeExtensions(extensions.map((x) => x.id));
        // release the menu element
        element.removeAttribute(EXTENSION_POINT_DATA_ATTR);
      } catch (exc) {
        this.logger.error(exc);
      }
    }

    for (const extension of extensions) {
      const clear = this.cancelDependencyObservers.get(extension.id);
      if (clear) {
        try {
          clear();
        } catch (err) {
          console.exception("Error cancelling dependency observer");
        }
      }
      this.cancelDependencyObservers.delete(extension.id);
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
    ctxtPromise: Promise<ReaderOutput>,
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
      dynamicCaption = false,
      action: actionConfig,
      icon = { id: "box", size: 18 },
    } = extension.config;

    const renderTemplate = engineRenderer(extension.templateEngine);

    const iconAsSVG = icon
      ? (
          await import(
            /* webpackChunkName: "icons" */
            "@/icons/svgIcons"
          )
        ).default
      : null;

    let html: string;

    if (extension.config.if) {
      // read latest state at the time of the action
      const ctxt = await ctxtPromise;
      const serviceContext = await makeServiceContext(extension.services);

      console.debug("Checking menuItem precondition", { ctxt, serviceContext });

      const show = await reducePipeline(
        extension.config.if,
        ctxt,
        extensionLogger,
        document,
        {
          validate: true,
          serviceArgs: serviceContext,
        }
      );

      if (!show) {
        this.watchDependencies(extension);
        return;
      }
    }

    if (dynamicCaption) {
      const ctxt = await ctxtPromise;
      const serviceContext = await makeServiceContext(extension.services);
      const extensionContext = { ...ctxt, ...serviceContext };
      html = Mustache.render(this.getTemplate(), {
        caption: renderTemplate(caption, extensionContext),
        icon: iconAsSVG?.(icon),
      });
    } else {
      html = Mustache.render(this.getTemplate(), {
        caption,
        icon: iconAsSVG?.(icon),
      });
    }

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
        const serviceContext = await makeServiceContext(extension.services);

        await reducePipeline(actionConfig, ctxt, extensionLogger, document, {
          validate: true,
          serviceArgs: serviceContext,
        });

        extensionLogger.info("Successfully ran menu action");

        $.notify(`Successfully ran action`, { className: "success" });
      } catch (ex) {
        if (hasCancelRootCause(ex)) {
          $.notify("The action was cancelled", { className: "info" });
        } else {
          extensionLogger.error(ex);
          $.notify(`Error running action: ${getErrorMessage(ex)}`, {
            className: "error",
          });
        }
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

    this.watchDependencies(extension);

    if (process.env.DEBUG) {
      const cancelObserver = onNodeRemoved($menuItem.get(0), () => {
        // Don't re-install here. We're reinstalling the entire menu
        console.debug(`Menu item for ${extension.id} was removed from the DOM`);
      });
      this.cancelPending.add(cancelObserver);
    }
  }

  watchDependencies(extension: IExtension<MenuItemExtensionConfig>): void {
    const { dependencies = [] } = extension.config;

    // clean up old observers
    if (this.cancelDependencyObservers.has(extension.id)) {
      this.cancelDependencyObservers.get(extension.id)();
      this.cancelDependencyObservers.delete(extension.id);
    }

    if (dependencies.length > 0) {
      const rerun = once(() => {
        console.debug("Dependency changed, re-running extension");
        this.run([extension.id]);
      });

      const observer = new MutationObserver(rerun);

      const cancellers: (() => void)[] = [];

      let elementCount = 0;
      for (const dependency of dependencies) {
        const $dependency = $(document).find(dependency);
        if ($dependency.length) {
          $dependency.each((index, element) => {
            elementCount++;
            observer.observe(element, {
              childList: true,
              subtree: true,
            });
          });
        } else {
          const [elementPromise, cancel] = awaitElementOnce(dependency);
          cancellers.push(cancel);
          elementPromise.then(() => {
            rerun();
          });
        }
      }

      console.debug(
        `Observing ${elementCount} element(s) for extension: ${extension.id}`
      );

      this.cancelDependencyObservers.set(extension.id, () => {
        try {
          observer.disconnect();
        } catch (err) {
          console.exception("Error cancelling mutation observer", err);
        }
        for (const cancel of cancellers) {
          try {
            cancel();
          } catch (err) {
            console.exception("Error cancelling dependency observer", err);
          }
        }
      });
    } else {
      console.debug(`Extension has no dependencies: ${extension.id}`);
    }
  }

  async run(extensionIds?: string[]): Promise<void> {
    if (!this.menus.size || !this.extensions.length) {
      return;
    }

    const errors = [];

    for (const menu of this.menus.values()) {
      const reader = await this.defaultReader();

      let ctxtPromise: Promise<ReaderOutput>;

      for (const extension of this.extensions) {
        if (extensionIds != null && !extensionIds.includes(extension.id)) {
          continue;
        }

        // Run in order so that the order stays the same for where they get rendered. The service
        // context is the only thing that's async as part of the initial configuration right now

        if (extension.config.dynamicCaption || extension.config.if) {
          // Lazily read context for the menu if one of the extensions actually uses it
          ctxtPromise = reader.read(this.getReaderRoot($(menu)));
        }

        try {
          await this.runExtension(menu, ctxtPromise, extension);
        } catch (ex) {
          errors.push(ex);
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
