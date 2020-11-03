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
} from "@/blocks/combinators";
import { IBlock, IExtension, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

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

  async waitReady() {
    throw new Error("TriggerExtensionPoint.waitReady not implemented");
  }

  async install(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }
    await this.waitReady();
    return true;
  }

  inputSchema: Schema = propertiesToSchema({
    action: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
    },
  });

  getBlocks(extension: IExtension<TriggerConfig>): IBlock[] {
    return blockList(extension.config.action);
  }

  async run(): Promise<void> {
    const reader = this.defaultReader();
    const readerContext = await reader.read();

    for (const extension of this.extensions) {
      const extensionLogger = this.logger.childLogger({
        extensionId: extension.id,
      });
      const { action } = extension.config;
      const serviceContext = await makeServiceContext(extension.services);
      await reducePipeline(action, readerContext, extensionLogger, {
        validate: true,
        serviceArgs: serviceContext,
      });
    }
  }
}
