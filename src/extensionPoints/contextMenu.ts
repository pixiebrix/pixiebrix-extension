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
  BlockConfig,
  blockList,
  BlockPipeline,
  makeServiceContext,
  mergeReaders,
  reducePipeline,
} from "@/blocks/combinators";
import { ExtensionPoint, Reader } from "@/types";
import {
  IBlock,
  IExtension,
  IExtensionPoint,
  IReader,
  ReaderOutput,
  Schema,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { ContextMenus, Permissions } from "webextension-polyfill-ts";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import castArray from "lodash/castArray";
import { checkAvailable } from "@/blocks/available";
import { ensureContextMenu } from "@/background/contextMenus";
import { registerHandler } from "@/contentScript/contextMenus";
import { reportError } from "@/telemetry/logging";

interface ContextMenuConfig {
  title: string;
  contexts: ContextMenus.ContextType | ContextMenus.ContextType[];
  action: BlockConfig | BlockPipeline;
}

let clickedElement: HTMLElement = null;

function setActiveElement(event: MouseEvent) {
  clickedElement = event.target as HTMLElement;
}

function installMouseHandler() {
  document.addEventListener("mousedown", setActiveElement, true);
}

class ContextMenuReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/context-menu-data",
      "Context menu reader",
      "Data from a context menu event"
    );
  }

  async isAvailable() {
    return true;
  }

  async read(): Promise<ReaderOutput> {
    // The actual field is set by the extension point, not the reader, because it's made available
    // by the browser API in the menu handler
    throw new Error("Not implemented");
  }

  outputSchema: Schema = {
    type: "object",
    properties: {
      mediaType: {
        type: "string",
        description:
          "One of 'image', 'video', or 'audio' if the context menu was activated on one of these types of elements.",
        enum: ["image", "video", "audio"],
      },
      linkText: {
        type: "string",
        description: "If the element is a link, the text of that link.",
      },
      linkUrl: {
        type: "string",
        description: "If the element is a link, the URL it points to.",
        format: "uri",
      },
      srcUrl: {
        type: "string",
        description: "Will be present for elements with a 'src' URL.",
        format: "uri",
      },
      selectionText: {
        type: "string",
        description: "The text for the context selection, if any.",
      },
    },
  };
}

/**
 * See also: https://developer.chrome.com/extensions/contextMenus
 */
export abstract class ContextMenuExtensionPoint extends ExtensionPoint<
  ContextMenuConfig
> {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faMousePointer"
  ) {
    super(id, name, description, icon);
  }

  abstract async getBaseReader(): Promise<IReader>;

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description:
          "The text to display in the item. When the context is selection, use %s within the string to show the selected text.",
      },
      contexts: {
        description: "The different contexts a menu can appear in.",
        default: ["page"],
        oneOf: [
          {
            type: "string",
            enum: [
              "all",
              "page",
              "frame",
              "selection",
              "link",
              "editable",
              "image",
              "video",
              "audio",
              "page",
            ],
          },
          {
            type: "array",
            items: {
              type: "string",
              enum: [
                "all",
                "page",
                "frame",
                "selection",
                "link",
                "editable",
                "image",
                "video",
                "audio",
                "page",
              ],
            },
            minProperties: 1,
          },
        ],
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
    },
    ["title", "action"]
  );

  async getBlocks(extension: IExtension<ContextMenuConfig>): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  async install(): Promise<boolean> {
    const available = await this.isAvailable();
    if (available) {
      installMouseHandler();
    }
    return available;
  }

  async defaultReader(): Promise<IReader> {
    return new ArrayCompositeReader([
      await this.getBaseReader(),
      new ContextMenuReader(),
    ]);
  }

  async runExtension(extension: IExtension<ContextMenuConfig>): Promise<void> {
    const { title, contexts, action: actionConfig } = extension.config;

    const serviceContext = await makeServiceContext(extension.services);

    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });

    await ensureContextMenu({
      extensionId: extension.id,
      contexts: castArray(contexts),
      title,
      documentUrlPatterns: this.permissions.origins,
    });

    registerHandler(extension.id, async (clickData) => {
      const ctxt = {
        ...(await (await this.getBaseReader()).read(
          clickedElement ?? document
        )),
        ...clickData,
      };
      await reducePipeline(actionConfig, ctxt, extensionLogger, document, {
        validate: true,
        serviceArgs: serviceContext,
      });
    });

    console.debug(`Added context menu ${title}`, {
      title,
      documentUrlPatterns: this.permissions.origins,
    });
  }

  async run(): Promise<void> {
    if (!this.extensions.length) {
      return;
    }

    const errors = [];

    for (const extension of this.extensions) {
      try {
        await this.runExtension(extension);
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
      $.notify(
        `An error occurred adding ${errors.length} context menu item(s)`,
        {
          className: "error",
        }
      );
    }
  }
}

interface MenuDefaultOptions {
  title?: string;
  contexts?: ContextMenus.ContextType | ContextMenus.ContextType[];
  [key: string]: string | string[];
}

interface MenuDefinition extends ExtensionPointDefinition {
  defaultOptions: MenuDefaultOptions;
}

class RemoteContextMenuExtensionPoint extends ContextMenuExtensionPoint {
  private readonly _definition: MenuDefinition;
  public readonly permissions: Permissions.Permissions;

  constructor(config: ExtensionPointConfig<MenuDefinition>) {
    const { id, name, description, icon } = config.metadata;
    super(id, name, description, icon);
    this._definition = config.definition;
    const { isAvailable } = config.definition;
    this.permissions = {
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  async isAvailable(): Promise<boolean> {
    return await checkAvailable(this._definition.isAvailable);
  }

  async getBaseReader() {
    return await mergeReaders(this._definition.reader);
  }

  public get defaultOptions(): {
    title: string;
    contexts: ContextMenus.ContextType[];
    [key: string]: string | string[];
  } {
    const { contexts = ["page"], ...other } = this._definition.defaultOptions;
    return {
      title: "PixieBrix",
      contexts: castArray(contexts),
      ...other,
    };
  }
}

export function fromJS(
  config: ExtensionPointConfig<MenuDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "contextMenu") {
    throw new Error(`Expected type=contextMenu, got ${type}`);
  }
  return new RemoteContextMenuExtensionPoint(config);
}
