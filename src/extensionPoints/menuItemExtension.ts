import { ExtensionPoint } from "@/types";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import Mustache from "mustache";
import iconAsSVG, { IconConfig } from "@/icons/svgIcons";
import { checkAvailable } from "@/blocks/available";
import "notifyjs-browser";
import castArray from "lodash/castArray";
import { engineRenderer } from "@/helpers";
import {
  reducePipeline,
  mergeReaders,
  blockList,
  BlockConfig,
  BlockPipeline,
  makeServiceContext,
} from "@/blocks/combinators";
import { reportError } from "@/telemetry/rollbar";
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
  BlockIcon,
  IBlock,
  IExtension,
  IExtensionPoint,
  ReaderOutput,
  Schema,
  ServiceLocator,
} from "@/core";
import psl, { ParsedDomain } from "psl";
import { safeTrack } from "@/telemetry/mixpanel";

interface MenuItemExtensionConfig {
  caption: string;
  action: BlockConfig | BlockPipeline;
  icon?: IconConfig;
}

export abstract class MenuItemExtensionPoint extends ExtensionPoint<
  MenuItemExtensionConfig
> {
  protected $menu?: JQuery;
  public get defaultOptions(): { caption: string } {
    return { caption: "Custom Menu Item" };
  }

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon: BlockIcon = faMousePointer
  ) {
    super(id, name, description, icon);
    this.$menu = undefined;
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema",
    type: "object",
    properties: {
      caption: {
        type: "string",
        description: "The caption for the menu item.",
      },
      action: { $ref: "https://app.pixiebrix.com/schemas/effect#" },
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
    },
    required: ["caption", "action"],
  };

  getTemplate() {
    if (this.template) return this.template;
    throw new Error("MenuItemExtensionPoint.getTemplate not implemented");
  }

  getContainerSelector(): string | string[] {
    throw new Error(
      "MenuItemExtensionPoint.getContainerSelector not implemented"
    );
  }

  getBlocks(extension: IExtension<MenuItemExtensionConfig>): IBlock[] {
    return blockList(extension.config.action);
  }

  async install() {
    if (!(await this.isAvailable())) {
      return false;
    }

    const selector = this.getContainerSelector();

    console.debug(`Awaiting menu container for ${this.id}: ${selector}`);

    this.$menu = await awaitElementOnce(selector);

    return acquireElement(this.$menu, this.id, () => {
      console.debug(`Menu removed from DOM for ${this.id}: ${selector}`);
      this.$menu = undefined;
    });
  }

  private async runExtension(
    ctxt: ReaderOutput,
    locator: ServiceLocator,
    extension: IExtension<MenuItemExtensionConfig>
  ) {
    console.debug(`Running extension ${extension.id}`);

    const {
      caption,
      action: actionConfig,
      icon = { id: "box", size: 18 },
    } = extension.config;

    const $existingItem = this.$menu.find(
      `[data-pixiebrix-uuid="${extension.id}"]`
    );

    const serviceContext = await makeServiceContext(
      extension.services,
      locator
    );
    const renderTemplate = engineRenderer(extension.templateEngine);
    const extensionContext = { ...ctxt, ...serviceContext };

    console.debug("Extension context", { serviceContext, ctxt });

    const $menuItem = $(
      Mustache.render(this.getTemplate(), {
        caption: renderTemplate(caption, extensionContext),
        icon: iconAsSVG(icon),
      })
    );

    $menuItem.attr("data-pixiebrix-uuid", extension.id);

    const blocks = castArray(actionConfig);
    const lastBlockId = blocks[blocks.length - 1].id;

    $menuItem.on("click", async () => {
      safeTrack("MenuItemExtensionPoint:click", {
        actionId: lastBlockId,
        domain: (psl.parse(window.location.hostname) as ParsedDomain).domain,
      });
      try {
        await reducePipeline(actionConfig, ctxt, {
          validate: true,
          serviceArgs: serviceContext,
        });
        $.notify(`Successfully ran menu action`, { className: "success" });
      } catch (ex) {
        // eslint-disable-next-line require-await
        reportError(ex);
        $.notify(`Error running menu action: ${ex}`, { className: "error" });
      }
    });

    if ($existingItem.length) {
      // shouldn't need to unbind click handlers because we'll replace it outright
      console.debug(`Replacing existing menu item for ${extension.id}`);
      $existingItem.replaceWith($menuItem);
    } else {
      console.debug(`Appending new menu item ${extension.id}`);
      this.$menu.append($menuItem);
    }

    onNodeRemoved($menuItem.get(0), () => {
      console.debug(`Menu item for ${extension.id} was removed from the DOM`);
    });
  }

  async run(locator: ServiceLocator) {
    if (!this.$menu || !this.extensions.length) {
      return;
    }

    const reader = this.defaultReader();
    const ctxt = await reader.read();

    if (ctxt == null) {
      throw new Error("Reader returned null/undefined");
    }

    const errors = [];

    for (const extension of this.extensions) {
      // Run in order so that the order stays the same for where they get rendered. The service context is the
      // only thing that's async as part of the initial configuration right now
      try {
        await this.runExtension(ctxt, locator, extension);
      } catch (ex) {
        // eslint-disable-next-line require-await
        reportError(ex);
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

interface MenuDefaultOptions {
  caption?: string;
  [key: string]: string;
}

interface MenuDefinition extends ExtensionPointDefinition {
  template: string;
  containerSelector: string;
  defaultOptions: MenuDefaultOptions;
}

class HydratedMenuItemExtensionPoint extends MenuItemExtensionPoint {
  private readonly _definition: MenuDefinition;

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
  }

  defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  getPermissions() {
    const { isAvailable } = this._definition;
    return {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
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
  return new HydratedMenuItemExtensionPoint(config);
}
