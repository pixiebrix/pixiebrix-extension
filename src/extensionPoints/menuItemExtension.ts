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

import { uuidv4 } from "@/types/helpers";
import { ExtensionPoint } from "@/types";
import { checkAvailable } from "@/blocks/available";
import { castArray, cloneDeep, debounce, merge, once } from "lodash";
import {
  InitialValues,
  reduceExtensionPipeline,
  reducePipeline,
} from "@/runtime/reducePipeline";
import {
  hasCancelRootCause,
  MultipleElementsFoundError,
  NoElementsFoundError,
  PromiseCancelled,
} from "@/errors";
import {
  acquireElement,
  awaitElementOnce,
  onNodeRemoved,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import {
  IBlock,
  IconConfig,
  IExtensionPoint,
  Logger,
  Metadata,
  ReaderOutput,
  ResolvedExtension,
  Schema,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { Permissions } from "webextension-polyfill";
import { reportEvent } from "@/telemetry/events";
import notify, {
  DEFAULT_ACTION_RESULTS,
  MessageConfig,
  notifyResult,
} from "@/utils/notify";
import { getNavigationId } from "@/contentScript/context";
import { rejectOnCancelled } from "@/utils";
import getSvgIcon from "@/icons/getSvgIcon";
import { selectEventData } from "@/telemetry/deployments";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import apiVersionOptions, {
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import { engineRenderer } from "@/runtime/renderers";
import { mapArgs } from "@/runtime/mapArgs";
import { blockList } from "@/blocks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { $safeFind } from "@/helpers";
import sanitize from "@/utils/sanitize";
import { EXTENSION_POINT_DATA_ATTR } from "@/common";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import reportError from "@/telemetry/reportError";
import pluralize from "@/utils/pluralize";

interface ShadowDOM {
  mode?: "open" | "closed";
  tag?: string;
}

export const DATA_ATTR = "data-pb-uuid";

const MENU_INSTALL_ERROR_DEBOUNCE_MS = 1000;

export type MenuItemExtensionConfig = {
  /**
   * The button caption to supply to the `caption` in the extension point template.
   * If `dynamicCaption` is true, can include template expressions.
   */
  caption: string;

  /**
   * (Optional) the icon to supply to the icon in the extension point template
   */
  icon?: IconConfig;

  /**
   * The action to perform when the button is clicked
   */
  action: BlockConfig | BlockPipeline;

  /**
   * (Experimental) condition to determine whether or not to show the menu item
   * @see if
   */
  if?: BlockConfig | BlockPipeline;

  /**
   * (Experimental) re-install the menu if an off the selectors change.
   * @see if
   */
  dependencies?: string[];

  /**
   * True if caption is determined dynamically (using the reader and templating)
   */
  dynamicCaption?: boolean;

  onError?: MessageConfig;
  onCancel?: MessageConfig;
  onSuccess?: MessageConfig;
};

export const actionSchema: Schema = {
  oneOf: [
    { $ref: "https://app.pixiebrix.com/schemas/effect#" },
    {
      type: "array",
      items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
    },
  ],
};

export async function cancelOnNavigation<T>(promise: Promise<T>): Promise<T> {
  const startNavigationId = getNavigationId();
  const isNavigationCancelled = () => getNavigationId() !== startNavigationId;
  return rejectOnCancelled(promise, isNavigationCancelled);
}

export abstract class MenuItemExtensionPoint extends ExtensionPoint<MenuItemExtensionConfig> {
  /**
   * Mapping of menu container UUID to the DOM element for the menu container
   * @protected
   */
  protected readonly menus: Map<string, HTMLElement>;

  private readonly instanceId: string;

  /**
   * Set of menu container UUID that have been removed from the DOM. Track so we we know which ones we've already
   * taken action on to attempt to reacquire a menu container for
   * @private
   */
  private readonly removed: Set<string>;

  /**
   * Set of methods to call to cancel any DOM watchers associated with this extension point
   * @private
   */
  private readonly cancelPending: Set<() => void>;

  private readonly cancelDependencyObservers: Map<string, () => void>;

  private uninstalled = false;

  private readonly notifyError = debounce(
    notify.error,
    MENU_INSTALL_ERROR_DEBOUNCE_MS,
    {
      leading: true,
      trailing: false,
    }
  ) as typeof notify.error; // `debounce` loses the overloads

  public get kind(): "menuItem" {
    return "menuItem";
  }

  public override get defaultOptions(): { caption: string } {
    return { caption: "Custom Menu Item" };
  }

  protected constructor(metadata: Metadata, logger: Logger) {
    super(metadata, logger);
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
        // `cancelObserver` should always be defined given it's type. But check just in case since we don't have
        // strictNullChecks on
        if (cancelObserver) {
          cancelObserver();
        }
      } catch (error) {
        // Try to proceed as normal
        reportError(error, this.logger.context);
      }
    }

    this.cancelPending.clear();
  }

  removeExtensions(extensionIds: string[]): void {
    console.debug(
      "Remove extensionIds for menuItem extension point: %s",
      this.id,
      { extensionIds }
    );
    // Can't use this.menus.values() here b/c because it may have already been cleared
    for (const extensionId of extensionIds) {
      const $item = $safeFind(`[${DATA_ATTR}="${extensionId}"]`);
      if ($item.length === 0) {
        console.warn(`Item for ${extensionId} was not in the menu`);
      }

      $item.remove();
    }
  }

  public override uninstall(): void {
    this.uninstalled = true;

    const menus = [...this.menus.values()];

    // Clear so they don't get re-added by the onNodeRemoved mechanism
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
        // Release the menu element
        element.removeAttribute(EXTENSION_POINT_DATA_ATTR);
      } catch (error) {
        this.logger.error(error);
      }
    }

    for (const extension of extensions) {
      const clear = this.cancelDependencyObservers.get(extension.id);
      if (clear) {
        try {
          clear();
        } catch {
          console.error("Error cancelling dependency observer");
        }
      }

      this.cancelDependencyObservers.delete(extension.id);
    }
  }

  getReaderRoot(_$containerElement: JQuery): HTMLElement | Document {
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
    extension: ResolvedExtension<MenuItemExtensionConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  private async reacquire(uuid: string): Promise<void> {
    if (this.uninstalled) {
      console.warn(
        `${this.instanceId}: cannot reacquire because extension ${this.id} is destroyed`
      );
      return;
    }

    const alreadyRemoved = this.removed.has(uuid);
    this.removed.add(uuid);
    if (alreadyRemoved) {
      console.warn(
        `${this.instanceId}: menu ${uuid} removed from DOM multiple times for ${this.id}`
      );
    } else {
      console.debug(
        `${this.instanceId}: menu ${uuid} removed from DOM for ${this.id}`
      );
      this.menus.delete(uuid);
      // Re-install the menus (will wait for the menu selector to re-appear)
      await this.installMenus();
      await this.run();
    }
  }

  /**
   * Find and claim the new menu containers currently on the page for the extension point.
   * @return true iff one or more menu containers were found
   */
  private async installMenus(): Promise<boolean> {
    if (this.uninstalled) {
      console.error("Menu item extension point is uninstalled", {
        extensionId: this.instanceId,
      });
      throw new Error(
        "Cannot install menu item because extension point was uninstalled"
      );
    }

    const selector = this.getContainerSelector();

    console.debug(
      `${this.instanceId}: awaiting menu container for ${this.id}`,
      {
        selector,
      }
    );

    const [menuPromise, cancelWait] = awaitElementOnce(selector);
    this.cancelPending.add(cancelWait);

    const $menuContainers = (await cancelOnNavigation(menuPromise)) as JQuery;

    const menuContainers = [...this.menus.values()];

    let existingCount = 0;

    const cancelObservers = [];
    for (const element of $menuContainers) {
      // Only acquire new menu items, otherwise we end up with duplicate entries in this.menus which causes
      // repeat evaluation of menus in this.run
      if (menuContainers.includes(element)) {
        existingCount++;
      } else {
        const menuUUID = uuidv4();
        this.menus.set(menuUUID, element);
        cancelObservers.push(
          acquireElement(element, this.id, async () => this.reacquire(menuUUID))
        );
      }
    }

    for (const cancelObserver of cancelObservers) {
      this.cancelPending.add(cancelObserver);
    }

    return cancelObservers.length + existingCount > 0;
  }

  async install(): Promise<boolean> {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      return false;
    }

    return this.installMenus();
  }

  protected abstract makeItem(
    html: string,
    extension: ResolvedExtension<MenuItemExtensionConfig>
  ): JQuery;

  private async runExtension(
    menu: HTMLElement,
    ctxtPromise: Promise<ReaderOutput>,
    extension: ResolvedExtension<MenuItemExtensionConfig>
  ) {
    if (!extension.id) {
      this.logger.error(`Refusing to run extension without id for ${this.id}`);
      return;
    }

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    console.debug(
      `${this.instanceId}: running menuItem extension ${extension.id}`
    );

    // Safe because menu is an HTMLElement, not a string
    const $menu = $(menu);

    const {
      caption,
      dynamicCaption = false,
      action: actionConfig,
      onCancel,
      onError,
      onSuccess,
      icon = { id: "box", size: 18 },
    } = extension.config;

    const versionOptions = apiVersionOptions(extension.apiVersion);

    const implicitRender = versionOptions.explicitRender
      ? null
      : await engineRenderer(
          extension.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
          versionOptions
        );

    let html: string;

    if (extension.config.if) {
      // Read the latest state at the time of the action
      const input = await ctxtPromise;
      const serviceContext = await makeServiceContext(extension.services);

      console.debug("Checking menuItem precondition", {
        input,
        serviceContext,
      });

      const initialValues: InitialValues = {
        input,
        serviceContext,
        optionsArgs: extension.optionsArgs,
        root: document,
      };

      // NOTE: don't use reduceExtensionPipeline because this is just evaluating the condition and shouldn't show up
      // as a "run" in the logs/traces. We also leave off the extensionLogger (see note)
      const show = await reducePipeline(extension.config.if, initialValues, {
        // Don't pass extension: extensionLogger because our log display doesn't handle the in-extension point
        // conditionals yet
        ...versionOptions,
      });

      if (!show) {
        this.watchDependencies(extension);
        return;
      }
    }

    const renderMustache = await engineRenderer("mustache", versionOptions);

    if (dynamicCaption) {
      const ctxt = await ctxtPromise;
      const serviceContext = await makeServiceContext(extension.services);
      const extensionContext = { ...ctxt, ...serviceContext };

      html = renderMustache(this.getTemplate(), {
        caption: (await mapArgs(caption, extensionContext, {
          implicitRender,
          autoescape: versionOptions.autoescape,
        })) as string,
        icon: icon ? await getSvgIcon(icon) : null,
      }) as string;
    } else {
      html = renderMustache(this.getTemplate(), {
        caption,
        icon: icon ? await getSvgIcon(icon) : null,
      }) as string;
    }

    const $menuItem = this.makeItem(html, extension);

    $menuItem.on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      console.debug("Run menu item", this.logger.context);

      reportEvent("MenuItemClick", selectEventData(extension));

      try {
        // Read the latest state at the time of the action
        const reader = await this.defaultReader();

        const initialValues: InitialValues = {
          input: await reader.read(this.getReaderRoot($menu)),
          serviceContext: await makeServiceContext(extension.services),
          optionsArgs: extension.optionsArgs,
          root: document,
        };

        await reduceExtensionPipeline(actionConfig, initialValues, {
          logger: extensionLogger,
          ...apiVersionOptions(extension.apiVersion),
        });

        extensionLogger.info("Successfully ran menu action");

        notifyResult(
          extension.id,
          merge({}, onSuccess, DEFAULT_ACTION_RESULTS.success)
        );
      } catch (error) {
        if (hasCancelRootCause(error)) {
          notifyResult(
            extension.id,
            merge({}, onCancel, DEFAULT_ACTION_RESULTS.cancel)
          );
        } else {
          extensionLogger.error(error);
          notifyResult(
            extension.id,
            merge({}, onError, DEFAULT_ACTION_RESULTS.error)
          );
        }
      }
    });

    const $existingItem = $menu.find(`[${DATA_ATTR}="${extension.id}"]`);

    if ($existingItem.length > 0) {
      // We don't need to unbind any click handlers because we're replacing the element completely.
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

  watchDependencies(
    extension: ResolvedExtension<MenuItemExtensionConfig>
  ): void {
    const { dependencies = [] } = extension.config;

    // Clean up old observers
    if (this.cancelDependencyObservers.has(extension.id)) {
      this.cancelDependencyObservers.get(extension.id)();
      this.cancelDependencyObservers.delete(extension.id);
    }

    if (dependencies.length > 0) {
      const rerun = once(() => {
        console.debug("Dependency changed, re-running extension");
        void this.run([extension.id]);
      });

      const observer = new MutationObserver(rerun);

      const cancellers: Array<() => void> = [];

      let elementCount = 0;
      for (const dependency of dependencies) {
        const $dependency = $safeFind(dependency);
        if ($dependency.length > 0) {
          for (const element of $dependency) {
            elementCount++;
            observer.observe(element, {
              childList: true,
              subtree: true,
            });
          }
        } else {
          const [elementPromise, cancel] = awaitElementOnce(dependency);
          cancellers.push(cancel);
          // eslint-disable-next-line promise/prefer-await-to-then -- TODO: Maybe refactor
          void elementPromise.then(() => {
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
        } catch (error) {
          console.error("Error cancelling mutation observer", error);
        }

        for (const cancel of cancellers) {
          try {
            cancel();
          } catch (error) {
            console.error("Error cancelling dependency observer", error);
          }
        }
      });
    } else {
      console.debug(`Extension has no dependencies: ${extension.id}`);
    }
  }

  async run(extensionIds?: string[]): Promise<void> {
    if (this.menus.size === 0 || this.extensions.length === 0) {
      return;
    }

    const startNavigationId = getNavigationId();
    const isNavigationCancelled = () => getNavigationId() !== startNavigationId;

    const errors = [];

    const containerSelector = this.getContainerSelector();
    const $currentMenus = $safeFind(castArray(containerSelector).join(" "));
    const currentMenus = $currentMenus.toArray();

    for (const menu of this.menus.values()) {
      if (!currentMenus.includes(menu)) {
        console.debug(
          "Skipping menu because it's no longer found by the container selector"
        );
        continue;
      }

      const reader = await this.defaultReader();

      let ctxtPromise: Promise<ReaderOutput>;

      for (const extension of this.extensions) {
        // Run in order so that the order stays the same for where they get rendered. The service
        // context is the only thing that's async as part of the initial configuration right now

        if (extensionIds != null && !extensionIds.includes(extension.id)) {
          continue;
        }

        if (isNavigationCancelled()) {
          continue;
        }

        if (extension.config.dynamicCaption || extension.config.if) {
          // Lazily read context for the menu if one of the extensions actually uses it

          // Wrap in rejectOnCancelled because if the reader takes a long time to run, the user may
          // navigate away from the page before the reader comes back.
          ctxtPromise = rejectOnCancelled(
            reader.read(this.getReaderRoot($(menu))),
            isNavigationCancelled
          );
        }

        try {
          await this.runExtension(menu, ctxtPromise, extension);
        } catch (error) {
          if (error instanceof PromiseCancelled) {
            console.debug(
              `menuItemExtension run promise cancelled for extension: ${extension.id}`
            );
          } else {
            errors.push(error);
            reportError(error, {
              deploymentId: extension._deployment?.id,
              extensionPointId: extension.extensionPointId,
              extensionId: extension.id,
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      const subject = pluralize(errors.length, "the button", "$$ buttons");
      const message = `An error occurred adding ${subject}`;
      console.warn(message, { errors });
      this.notifyError({
        message,
        reportError: false, // We already reported it in the loop above
      });
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
      // Element to insert the menu item before, selector is relative to the container
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

  public readonly rawConfig: ExtensionPointConfig<MenuDefinition>;

  public override get defaultOptions(): {
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
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    super(cloned.metadata, new BackgroundLogger());
    this._definition = cloned.definition;
    this.rawConfig = cloned;
    const { isAvailable } = cloned.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  override addMenuItem($menu: JQuery, $menuItem: JQuery): void {
    const { position = "append" } = this._definition;

    if (typeof position === "object") {
      if (position.sibling) {
        const $sibling = $safeFind(position.sibling, $menu);
        if ($sibling.length > 1) {
          throw new Error(
            `Multiple sibling elements for selector: ${position.sibling}`
          );
        }

        if ($sibling.length === 1) {
          $sibling.before($menuItem);
        } else {
          // Didn't find the sibling, so just try inserting it at the end
          $menu.append($menuItem);
        }
      } else {
        // No element to insert the item before, so insert it at the end.
        $menu.append($menuItem);
      }
    } else {
      switch (position) {
        case "prepend":
        case "append": {
          // Safe because we're checking the value in the case statements
          // eslint-disable-next-line security/detect-object-injection
          $menu[position]($menuItem);
          break;
        }

        default: {
          throw new Error(`Unexpected position ${String(position)}`);
        }
      }
    }
  }

  override getReaderRoot($containerElement: JQuery): HTMLElement | Document {
    const selector = this._definition.readerSelector;
    if (selector) {
      if ($containerElement.length > 1) {
        console.warn("getReaderRoot called with multiple containerElements");
      }

      const $elt = $containerElement.parents(selector);
      if ($elt.length > 1) {
        throw new MultipleElementsFoundError(
          selector,
          "Multiple elements found for reader selector"
        );
      }

      if ($elt.length === 0) {
        throw new NoElementsFoundError(
          selector,
          "No elements found for reader selector"
        );
      }

      return $elt.get(0);
    }

    return document;
  }

  override async defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  override getContainerSelector() {
    return this._definition.containerSelector;
  }

  override getTemplate(): string {
    return this._definition.template;
  }

  protected makeItem(
    unsanitizedHTML: string,
    extension: ResolvedExtension<MenuItemExtensionConfig>
  ): JQuery {
    const sanitizedHTML = sanitize(unsanitizedHTML);

    let $root: JQuery;

    if (this._definition.shadowDOM) {
      const root = document.createElement(this._definition.shadowDOM.tag);
      const shadowRoot = root.attachShadow({ mode: "closed" });
      shadowRoot.innerHTML = sanitizedHTML;
      $root = $(root);
    } else {
      $root = $(sanitizedHTML);
    }

    $root.attr(DATA_ATTR, extension.id);

    return $root;
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this._definition.isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<MenuDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "menuItem") {
    // `type` is `never` here due to the if-statement
    throw new Error(`Expected type=menuItem, got ${type as string}`);
  }

  return new RemoteMenuItemExtensionPoint(config);
}
