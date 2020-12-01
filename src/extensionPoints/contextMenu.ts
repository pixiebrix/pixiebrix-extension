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
import { Permissions } from "webextension-polyfill-ts";
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

interface SelectionContextMenuConfig {
  title: string;
  action: BlockConfig | BlockPipeline;
}

class SelectionTextReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/context-menu/selection-text",
      "Selection text from a context menu event"
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
      selectionText: {
        type: "string",
        description: "The text the user has selected",
      },
    },
  };
}

export abstract class SelectionContextMenuExtensionPoint extends ExtensionPoint<
  SelectionContextMenuConfig
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
        description: "The caption for the context menu item.",
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

  async getBlocks(
    extension: IExtension<SelectionContextMenuConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  async install(): Promise<boolean> {
    return await this.isAvailable();
  }

  async defaultReader(): Promise<IReader> {
    return new ArrayCompositeReader([
      await this.getBaseReader(),
      new SelectionTextReader(),
    ]);
  }

  async runExtension(
    extension: IExtension<SelectionContextMenuConfig>
  ): Promise<void> {
    const { title, action: actionConfig } = extension.config;

    const serviceContext = await makeServiceContext(extension.services);

    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });

    await ensureContextMenu({
      extensionId: extension.id,
      title,
      documentUrlPatterns: this.permissions.origins,
    });

    registerHandler(extension.id, async ({ selectionText }) => {
      const ctxt = {
        ...(await (await this.getBaseReader()).read(document)),
        selectionText,
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

interface ActionDefaultOptions {
  title?: string;
  [key: string]: string;
}

interface ActionDefinition extends ExtensionPointDefinition {
  defaultOptions: ActionDefaultOptions;
}

class RemoteSelectionContextMenuExtensionPoint extends SelectionContextMenuExtensionPoint {
  private readonly _definition: ActionDefinition;
  public readonly permissions: Permissions.Permissions;

  constructor(config: ExtensionPointConfig<ActionDefinition>) {
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
    [key: string]: string;
  } {
    return {
      title: "PixieBrix",
      ...this._definition.defaultOptions,
    };
  }
}

export function fromJS(
  config: ExtensionPointConfig<ActionDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "selectionAction") {
    throw new Error(`Expected type=selectionAction, got ${type}`);
  }
  return new RemoteSelectionContextMenuExtensionPoint(config);
}
