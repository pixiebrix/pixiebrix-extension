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
import { castArray, uniq, compact } from "lodash";
import { checkAvailable } from "@/blocks/available";
import { ensureContextMenu } from "@/background/contextMenus";
import { registerHandler } from "@/contentScript/contextMenus";
import { reportError } from "@/telemetry/logging";
import { Manifest } from "webextension-polyfill-ts/lib/manifest";
import { getCommonAncestor } from "@/nativeEditor/infer";

export interface ContextMenuConfig {
  title: string;
  action: BlockConfig | BlockPipeline;
}

let clickedElement: HTMLElement = null;
let installedHandler = false;

const BUTTON_SECONDARY = 2;

function setActiveElement(event: MouseEvent): void {
  // This method can't throw, otherwise I think it breaks event dispatching because we're passing
  // useCapture: true to the event listener
  clickedElement = null;
  try {
    if (event?.button === BUTTON_SECONDARY) {
      clickedElement = event?.target as HTMLElement;
    }
  } catch (err) {
    try {
      reportError(err);
    } catch (err) {
      console.error(err);
    }
  }
}

function guessSelectedElement(): HTMLElement | null {
  const selection = document.getSelection();
  if (selection?.rangeCount) {
    const start = selection.getRangeAt(0).startContainer.parentNode;
    const end = selection.getRangeAt(selection.rangeCount - 1).endContainer
      .parentNode;
    const node = getCommonAncestor(start, end);
    if ("tagName" in node) {
      return node;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

function installMouseHandlerOnce(): void {
  if (!installedHandler) {
    installedHandler = true;
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    document.addEventListener("mousedown", setActiveElement, {
      // handle it first in case a target beneath it cancels the event
      capture: true,
      // for performance, indicate we won't call preventDefault
      passive: true,
    });
  }
}

export class ContextMenuReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/context-menu-data",
      "Context menu reader",
      "Data from a context menu event"
    );
  }

  async isAvailable(): Promise<boolean> {
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
      documentUrl: {
        type: "string",
        description: "The URL of the page where the context menu was activated",
        format: "uri",
      },
    },
  };
}

/**
 * See also: https://developer.chrome.com/extensions/contextMenus
 */
export abstract class ContextMenuExtensionPoint extends ExtensionPoint<ContextMenuConfig> {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faMousePointer"
  ) {
    super(id, name, description, icon);
  }

  abstract async getBaseReader(): Promise<IReader>;
  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];
  abstract readonly contexts: ContextMenus.ContextType[];

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description:
          "The text to display in the item. When the context is selection, use %s within the string to show the selected text.",
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

  uninstall(): void {
    // Clear out the context menu for this content script. It's still installed on other tabs through because we
    // haven't unregistered things
    clickedElement = null;
    this.extensions.splice(0, this.extensions.length);
    document.removeEventListener("mousedown", setActiveElement);
  }

  async install(): Promise<boolean> {
    const available = await this.isAvailable();
    if (available) {
      installMouseHandlerOnce();
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
    const { title, action: actionConfig } = extension.config;

    const serviceContext = await makeServiceContext(extension.services);

    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });

    const patterns = compact(
      uniq([...this.documentUrlPatterns, ...(this.permissions?.origins ?? [])])
    );

    await ensureContextMenu({
      extensionId: extension.id,
      contexts: this.contexts,
      title,
      documentUrlPatterns: patterns,
    });

    registerHandler(extension.id, async (clickData) => {
      const reader = await this.getBaseReader();

      const targetElement =
        clickedElement ?? guessSelectedElement() ?? document;

      const ctxt = {
        ...(await reader.read(targetElement)),
        // clickData provides the data from schema defined above in ContextMenuReader
        ...clickData,
        // add some additional data that people will generally want
        documentUrl: document.location.href,
      };

      await reducePipeline(actionConfig, ctxt, extensionLogger, document, {
        validate: true,
        serviceArgs: serviceContext,
      });
    });

    console.debug(`Added context menu ${title}`, {
      title,
      documentUrlPatterns: patterns,
    });
  }

  async run(): Promise<void> {
    if (!this.extensions.length) {
      console.debug(
        `contextMenu extension point ${this.id} has no installed extension`
      );
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

export interface MenuDefaultOptions {
  title?: string;
  [key: string]: string | string[];
}

export interface MenuDefinition extends ExtensionPointDefinition {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: ContextMenus.ContextType[];
  defaultOptions?: MenuDefaultOptions;
}

class RemoteContextMenuExtensionPoint extends ContextMenuExtensionPoint {
  private readonly _definition: MenuDefinition;
  public readonly permissions: Permissions.Permissions;
  public readonly documentUrlPatterns: Manifest.MatchPattern[];
  public readonly contexts: ContextMenus.ContextType[];

  constructor(config: ExtensionPointConfig<MenuDefinition>) {
    const { id, name, description, icon } = config.metadata;
    super(id, name, description, icon);
    this._definition = config.definition;
    const { isAvailable, documentUrlPatterns, contexts } = config.definition;
    // if documentUrlPatterns not specified show everywhere
    this.documentUrlPatterns = castArray(documentUrlPatterns ?? ["*://*/*"]);
    this.contexts = castArray(contexts);
    this.permissions = {
      origins: isAvailable.matchPatterns
        ? castArray(isAvailable.matchPatterns)
        : [],
    };
  }

  async isAvailable(): Promise<boolean> {
    return (
      (await checkAvailable(this._definition.isAvailable)) ||
      (await checkAvailable({
        matchPatterns: this._definition.documentUrlPatterns,
      }))
    );
  }

  async getBaseReader() {
    return await mergeReaders(this._definition.reader);
  }

  public get defaultOptions(): {
    title: string;
    [key: string]: string | string[];
  } {
    return {
      title: "PixieBrix",
      ...this._definition.defaultOptions,
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
