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

import { ExtensionPoint } from "@/types";
import {
  reducePipeline,
  blockList,
  BlockPipeline,
  BlockConfig,
  makeServiceContext,
  mergeReaders,
} from "@/blocks/combinators";
import {
  IBlock,
  IExtension,
  IExtensionPoint,
  ReaderOutput,
  Schema,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { Permissions } from "webextension-polyfill-ts";
import castArray from "lodash/castArray";
import { checkAvailable } from "@/blocks/available";
import { reportError } from "@/telemetry/logging";

interface TriggerConfig {
  action: BlockPipeline | BlockConfig;
}

export abstract class TriggerExtensionPoint extends ExtensionPoint<
  TriggerConfig
> {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faBolt"
  ) {
    super(id, name, description, icon);
  }

  async install(): Promise<boolean> {
    return await this.isAvailable();
  }

  inputSchema: Schema = propertiesToSchema({
    action: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
    },
  });

  getBlocks(extension: IExtension<TriggerConfig>): IBlock[] {
    return blockList(extension.config.action);
  }

  private async runExtension(
    ctxt: ReaderOutput,
    extension: IExtension<TriggerConfig>
  ) {
    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });

    const { action: actionConfig } = extension.config;

    console.debug(`Running trigger extension ${extension.id}`);

    const serviceContext = await makeServiceContext(extension.services);

    try {
      await reducePipeline(actionConfig, ctxt, extensionLogger, {
        validate: true,
        serviceArgs: serviceContext,
      });
      extensionLogger.info("Successfully ran trigger");
    } catch (ex) {
      extensionLogger.error(ex);
    }
  }

  async run(): Promise<void> {
    const reader = this.defaultReader();
    const readerContext = await reader.read(document);

    const errors = [];

    await Promise.allSettled(
      this.extensions.map(async (extension) => {
        try {
          await this.runExtension(readerContext, extension);
        } catch (ex) {
          // eslint-disable-next-line require-await
          reportError(ex, {
            extensionPointId: extension.extensionPointId,
            extensionId: extension.id,
          });
          errors.push(ex);
        }
      })
    );

    if (errors.length) {
      $.notify(`An error occurred running ${errors.length} triggers(s)`, {
        className: "error",
      });
    }
  }
}

interface TriggerDefinitionOptions {
  [option: string]: string;
}

interface TriggerDefinition extends ExtensionPointDefinition {
  defaultOptions: TriggerDefinitionOptions;
}

class RemoteTriggerExtensionPoint extends TriggerExtensionPoint {
  private readonly _definition: TriggerDefinition;
  public readonly permissions: Permissions.Permissions;

  public get defaultOptions(): {
    [option: string]: string;
  } {
    return this._definition.defaultOptions ?? {};
  }

  constructor(config: ExtensionPointConfig<TriggerDefinition>) {
    const { id, name, description, icon } = config.metadata;
    super(id, name, description, icon);
    this._definition = config.definition;
    const { isAvailable } = config.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  async isAvailable(): Promise<boolean> {
    return await checkAvailable(this._definition.isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<TriggerDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "trigger") {
    throw new Error(`Expected type=trigger, got ${type}`);
  }
  return new RemoteTriggerExtensionPoint(config);
}
