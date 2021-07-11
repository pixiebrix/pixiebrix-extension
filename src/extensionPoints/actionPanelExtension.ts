/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import {
  BlockConfig,
  blockList,
  BlockPipeline,
  makeServiceContext,
  mergeReaders,
  reducePipeline,
} from "@/blocks/combinators";
import { ExtensionPoint } from "@/types";
import {
  IBlock,
  IExtension,
  IExtensionPoint,
  IReader,
  ReaderOutput,
  Schema,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { Permissions } from "webextension-polyfill-ts";
import { checkAvailable } from "@/blocks/available";
import { notifyError } from "@/contentScript/notify";
import {
  isActionPanelVisible,
  registerShowCallback,
  removeExtensionPoint,
  removeShowCallback,
  reservePanels,
  ShowCallback,
  updateHeading,
  upsertPanel,
} from "@/actionPanel/native";
import Mustache from "mustache";
import { reportError } from "@/telemetry/logging";
import { v4 as uuidv4 } from "uuid";
import { getErrorMessage } from "@/extensionPoints/helpers";
import { BusinessError } from "@/errors";
import { HeadlessModeError } from "@/blocks/errors";

export interface ActionPanelConfig {
  heading: string;
  body: BlockConfig | BlockPipeline;
}

export abstract class ActionPanelExtensionPoint extends ExtensionPoint<ActionPanelConfig> {
  readonly permissions: Permissions.Permissions = {};
  readonly showCallback: ShowCallback;

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faColumns"
  ) {
    super(id, name, description, icon);
    this.showCallback = ActionPanelExtensionPoint.prototype.run.bind(this);
  }

  inputSchema: Schema = propertiesToSchema(
    {
      heading: {
        type: "string",
        description: "The heading for the panel",
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
    },
    ["heading", "body"]
  );

  async getBlocks(extension: IExtension<ActionPanelConfig>): Promise<IBlock[]> {
    return blockList(extension.config.body);
  }

  removeExtensions(): void {
    this.extensions.splice(0, this.extensions.length);
  }

  private async runExtension(
    readerContext: ReaderOutput,
    extension: IExtension<ActionPanelConfig>
  ) {
    const extensionLogger = this.logger.childLogger({
      deploymentId: extension._deployment?.id,
      extensionId: extension.id,
    });

    const serviceContext = await makeServiceContext(extension.services);
    const extensionContext = { ...readerContext, ...serviceContext };

    const { heading: rawHeading, body } = extension.config;

    const heading = Mustache.render(rawHeading, extensionContext);

    updateHeading(extension.id, heading);

    try {
      await reducePipeline(body, readerContext, extensionLogger, document, {
        validate: true,
        serviceArgs: serviceContext,
        optionsArgs: extension.optionsArgs,
        headless: true,
      });
      // We're expecting a HeadlessModeError (or other error) to be thrown in the line above
      // noinspection ExceptionCaughtLocallyJS
      throw new BusinessError("No renderer attached to body");
    } catch (error) {
      if (error instanceof HeadlessModeError) {
        upsertPanel(
          { extensionId: extension.id, extensionPointId: this.id },
          heading,
          {
            blockId: error.blockId,
            key: uuidv4(),
            ctxt: error.ctxt,
            args: error.args,
          }
        );
      } else {
        upsertPanel(
          { extensionId: extension.id, extensionPointId: this.id },
          heading,
          {
            key: uuidv4(),
            error: getErrorMessage(error as Error),
          }
        );
        reportError(error);
        throw error;
      }
    }
  }

  public uninstall(): void {
    this.removeExtensions();
    removeExtensionPoint(this.id);
    removeShowCallback(this.showCallback);
  }

  async run(extensionIds?: string[]): Promise<void> {
    if (!(await this.isAvailable())) {
      removeExtensionPoint(this.id);
      return;
    }

    if (this.extensions.length === 0) {
      console.debug(
        `actionPanel extension point ${this.id} has no installed extension`
      );
      return;
    }

    if (!isActionPanelVisible()) {
      console.debug(`actionPanel is not visible`);
      return;
    }

    reservePanels(
      this.extensions.map((x) => ({
        extensionId: x.id,
        extensionPointId: this.id,
      }))
    );

    const reader = await this.defaultReader();

    const readerContext = await reader.read(document);
    if (readerContext == null) {
      throw new Error("Reader returned null/undefined");
    }

    const errors = [];

    for (const extension of this.extensions) {
      if (extensionIds != null && !extensionIds.includes(extension.id)) {
        continue;
      }

      try {
        await this.runExtension(readerContext, extension);
      } catch (error) {
        errors.push(error);
        this.logger
          .childLogger({
            deploymentId: extension._deployment?.id,
            extensionId: extension.id,
          })
          .error(error);
      }
    }

    if (errors.length > 0) {
      notifyError(`An error occurred adding ${errors.length} panels(s)`);
    }
  }

  async install(): Promise<boolean> {
    const available = await this.isAvailable();
    if (available) {
      registerShowCallback(this.showCallback);
    } else {
      removeExtensionPoint(this.id);
    }
    return available;
  }
}

export type PanelDefinition = ExtensionPointDefinition;

class RemotePanelExtensionPoint extends ActionPanelExtensionPoint {
  private readonly definition: PanelDefinition;
  public readonly rawConfig: ExtensionPointConfig<PanelDefinition>;

  constructor(config: ExtensionPointConfig<PanelDefinition>) {
    const { id, name, description } = config.metadata;
    super(id, name, description);
    this.rawConfig = config;
    this.definition = config.definition;
  }

  async defaultReader(): Promise<IReader> {
    return mergeReaders(this.definition.reader);
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this.definition.isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<PanelDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "actionPanel") {
    throw new Error(`Expected type=actionPanel, got ${type}`);
  }
  return new RemotePanelExtensionPoint(config);
}
